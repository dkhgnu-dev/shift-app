from ortools.sat.python import cp_model
from models import ShiftInput
import calendar
import datetime

def solve_shift(input_data: ShiftInput):
    model = cp_model.CpModel()
    
    num_days = calendar.monthrange(input_data.year, input_data.month)[1]
    employees = input_data.employees
    shifts = input_data.shift_types
    
    shift_ids = [s.id for s in shifts] + ['OFF']
    num_shifts = len(shift_ids)
    
    # 登録販売者 (RS)
    rs_indices = [i for i, e in enumerate(employees) if e.is_registered_seller]
    
    # 希望休の処理
    requested_off = set()
    for req in input_data.requests_off:
        day = int(req.date.split('-')[2])
        requested_off.add((req.employee_id, day))
    
    # 変数定義
    x = {}
    for e_idx, emp in enumerate(employees):
        for d in range(num_days):
            for s_idx, s_id in enumerate(shift_ids):
                x[(e_idx, d, s_idx)] = model.NewBoolVar(f'shift_{emp.id}_{d}_{s_id}')
                
    # --- スラック変数 (ソフト制約化・診断用) ---
    slack_contract = {}  # 契約日数のズレ
    slack_off_req = {}   # 希望休の違反
    slack_rs = {}        # 登販不足
    
    # 1. 各従業員の基本制約
    for e_idx, emp in enumerate(employees):
        allowed_s_indices = [shift_ids.index(s_id) for s_id in emp.allowed_shifts if s_id in shift_ids]
        off_idx = shift_ids.index('OFF')
        
        for d in range(num_days):
            # 1日1シフト
            model.AddExactlyOne([x[(e_idx, d, s_idx)] for s_idx in range(num_shifts)])
            
            # 不可シフト禁止
            for s_idx in range(num_shifts):
                if s_idx != off_idx and s_idx not in allowed_s_indices:
                    model.Add(x[(e_idx, d, s_idx)] == 0)
                    
            # 希望休 (スラック付き)
            if (emp.id, d + 1) in requested_off:
                s_viol = model.NewBoolVar(f'slack_off_{emp.id}_{d}')
                slack_off_req[(emp.id, d + 1)] = s_viol
                # s_viol == 0 なら OFF にする。s_viol == 1 なら出勤を許容する
                model.Add(x[(e_idx, d, off_idx)] == 1).OnlyEnforceIf(s_viol.Not())
                
        # 6連勤以上禁止 (絶対ルール)
        for start_d in range(num_days - 5):
            model.Add(sum(
                x[(e_idx, d, s_idx)] 
                for d in range(start_d, start_d + 6) 
                for s_idx in range(num_shifts) if s_idx != off_idx
            ) <= 5)
            
        # 契約日数遵守 (スラック付き)
        working_days = sum(x[(e_idx, d, s_idx)] for d in range(num_days) for s_idx in range(num_shifts) if s_idx != off_idx)
        slack_under = model.NewIntVar(0, num_days, f'slack_under_{emp.id}')
        slack_over = model.NewIntVar(0, num_days, f'slack_over_{emp.id}')
        model.Add(working_days + slack_under - slack_over == emp.contract_days)
        slack_contract[emp.id] = (slack_under, slack_over)

    # 2. 人数制限と登録販売者カバレッジ
    shift_coverage = {
        '①': [1], '②': [1, 2], '③': [1, 2, 3, 4], '④': [1, 2, 3, 4, 5, 6],
        '⑤': [2, 3, 4, 5, 6, 7], '⑥': [3, 4, 5, 6, 7], '⑦': [4, 5, 6, 7, 8, 9, 10],
        '⑧': [6, 7, 8, 9, 10], '⑨': [6, 7, 8, 9], '⑩': [8, 9, 10], '⑪': [9, 10]
    }

    total_contract_days = sum(emp.contract_days for emp in employees)
    target_daily_staff = total_contract_days // num_days
    max_by_percentage = max(1, int(len(employees) * 0.7))
    min_allowed = max(1, target_daily_staff - 1)
    max_allowed = min(target_daily_staff + 1, max_by_percentage)
    if max_allowed < min_allowed:
        min_allowed = max_allowed

    diff_vars = []
    for d in range(num_days):
        daily_workers = sum(x[(e_idx, d, s_idx)] for e_idx in range(len(employees)) for s_idx in range(num_shifts) if s_idx != off_idx)
        model.Add(daily_workers >= min_allowed)
        model.Add(daily_workers <= max_allowed)

        # 平準化差分
        diff = model.NewIntVar(0, len(employees), f'diff_{d}')
        model.AddAbsEquality(diff, daily_workers - target_daily_staff)
        diff_vars.append(diff)

        # 登録販売者カバレッジ (スラック付き)
        for block in range(1, 11):
            covering_vars = []
            for e_idx in rs_indices:
                for s_id, blocks in shift_coverage.items():
                    if block in blocks and s_id in shift_ids:
                        s_idx = shift_ids.index(s_id)
                        covering_vars.append(x[(e_idx, d, s_idx)])
            
            s_rs = model.NewBoolVar(f'slack_rs_{d}_{block}')
            slack_rs[(d + 1, block)] = s_rs
            if covering_vars:
                # s_rs == 0 なら少なくとも1名RSが必要。s_rs == 1 ならRS不足を認める
                model.Add(sum(covering_vars) >= 1).OnlyEnforceIf(s_rs.Not())
            else:
                model.Add(s_rs == 1)

    # === 辞書順最適化 (Lexicographic / Multi-Stage Optimization) ===

    # 【フェーズ 1】最優先: スラック（違反量）の最小化
    total_slack = []
    for (emp_id, (su, so)) in slack_contract.items():
        total_slack.append(100 * su + 100 * so)
    for req_key, s_viol in slack_off_req.items():
        total_slack.append(1000 * s_viol)
    for rs_key, s_rs in slack_rs.items():
        total_slack.append(2000 * s_rs)

    model.Minimize(sum(total_slack))

    solver = cp_model.CpSolver()
    solver.parameters.num_search_workers = 8
    solver.parameters.max_time_in_seconds = 8.0
    status1 = solver.Solve(model)

    if status1 in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
        best_slack = solver.Value(sum(total_slack))
        # フェーズ1の違反量を固定 (これ以上悪化させない)
        model.Add(sum(total_slack) <= best_slack)

    # 【フェーズ 2】次優先: 人数平準化 (平均人数からの偏り最小化)
    model.Minimize(sum(diff_vars))
    solver.parameters.max_time_in_seconds = 8.0
    status2 = solver.Solve(model)

    if status2 in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
        best_diff = solver.Value(sum(diff_vars))
        model.Add(sum(diff_vars) <= best_diff)

    # 【フェーズ 3】嗜好優先: 曜日順位(1〜7位)・抽選会等の最大化
    pref_terms = []
    lottery_days_count = 5 if input_data.month in [7, 12] else 4
    for d in range(num_days):
        current_date = datetime.date(input_data.year, input_data.month, d + 1)
        weekday = current_date.weekday()
        day_weight = 0
        if input_data.weekday_ranks:
            w_key = str(weekday)
            if w_key in input_data.weekday_ranks:
                rank = int(input_data.weekday_ranks[w_key])
                if rank > 0:
                    day_weight += (8 - rank) - 4
        else:
            if weekday == 6: day_weight += 2
            elif weekday == 0: day_weight -= 1

        if d >= (num_days - lottery_days_count):
            day_weight += 4
        if (d + 1) in input_data.thick_staffing_days:
            day_weight += 5

        if day_weight != 0:
            for e_idx in range(len(employees)):
                for s_idx in range(num_shifts):
                    if s_idx != off_idx:
                        pref_terms.append(day_weight * x[(e_idx, d, s_idx)])

    if pref_terms:
        model.Maximize(sum(pref_terms))
    
    solver.parameters.max_time_in_seconds = 8.0
    status3 = solver.Solve(model)

    # 結果の構築と診断アドバイス (Warnings) の生成
    warnings = []
    
    # スラック値のチェック
    for emp in employees:
        su, so = slack_contract[emp.id]
        u_val = solver.Value(su)
        o_val = solver.Value(so)
        if u_val > 0:
            warnings.append(f"{emp.name}さん: 契約日数({emp.days}日)に対して割り当てが{u_val}日不足しています。")
        elif o_val > 0:
            warnings.append(f"{emp.name}さん: 契約日数({emp.days}日)に対して割り当てが{o_val}日超過しています。")

    for (emp_id, day), s_viol in slack_off_req.items():
        if solver.Value(s_viol) == 1:
            emp_name = next((e.name for e in employees if e.id == emp_id), emp_id)
            warnings.append(f"{emp_name}さん: {day}日の希望休が出勤となっています。")

    for (day, block), s_rs in slack_rs.items():
        if solver.Value(s_rs) == 1:
            warnings.append(f"{day}日: 時間帯ブロック{block}で登録販売者が不足しています。")

    result_shifts = {}
    for e_idx, emp in enumerate(employees):
        emp_shifts = []
        for d in range(num_days):
            for s_idx, s_id in enumerate(shift_ids):
                if solver.Value(x[(e_idx, d, s_idx)]) == 1:
                    emp_shifts.append(s_id if s_id != 'OFF' else '休')
        result_shifts[emp.id] = emp_shifts

    status_str = "SUCCESS" if len(warnings) == 0 else "FEASIBLE_WITH_WARNINGS"
    
    return {
        "status": status_str,
        "shifts": result_shifts,
        "score": 100 if len(warnings) == 0 else 80,
        "warnings": warnings,
        "message": warnings[0] if warnings else None
    }
