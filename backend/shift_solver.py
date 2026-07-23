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
    
    # Variables
    x = {}
    for e_idx, emp in enumerate(employees):
        for d in range(num_days):
            for s_idx, s_id in enumerate(shift_ids):
                x[(e_idx, d, s_idx)] = model.NewBoolVar(f'shift_{emp.id}_{d}_{s_id}')
                
    objective_terms = []

    # Constraints
    for e_idx, emp in enumerate(employees):
        allowed_s_indices = [shift_ids.index(s_id) for s_id in emp.allowed_shifts if s_id in shift_ids]
        off_idx = shift_ids.index('OFF')
        
        for d in range(num_days):
            model.AddExactlyOne([x[(e_idx, d, s_idx)] for s_idx in range(num_shifts)])
            
            for s_idx in range(num_shifts):
                if s_idx != off_idx and s_idx not in allowed_s_indices:
                    model.Add(x[(e_idx, d, s_idx)] == 0)
                    
            # 優先1: 希望休厳守
            if (emp.id, d + 1) in requested_off:
                model.Add(x[(e_idx, d, off_idx)] == 1)
                
        # 優先3&4: 契約日数遵守（ユーザー要望により絶対条件に戻す）
        working_days = sum(x[(e_idx, d, s_idx)] for d in range(num_days) for s_idx in range(num_shifts) if s_idx != off_idx)
        
        # 契約日数は必ず一致させる
        model.Add(working_days == emp.contract_days)
        
        # 優先5: 6連勤以上禁止 (最大5連勤)
        for start_d in range(num_days - 5):
            model.Add(sum(
                x[(e_idx, d, s_idx)] 
                for d in range(start_d, start_d + 6) 
                for s_idx in range(num_shifts) if s_idx != off_idx
            ) <= 5)

    shift_coverage = {
        '①': [1], '②': [1, 2], '③': [1, 2, 3, 4], '④': [1, 2, 3, 4, 5, 6],
        '⑤': [2, 3, 4, 5, 6, 7], '⑥': [3, 4, 5, 6, 7], '⑦': [4, 5, 6, 7, 8, 9, 10],
        '⑧': [6, 7, 8, 9, 10], '⑨': [6, 7, 8, 9], '⑩': [8, 9, 10], '⑪': [9, 10]
    }
    
    for d in range(num_days):
        current_date = datetime.date(input_data.year, input_data.month, d + 1)
        weekday = current_date.weekday()

        # 優先2: 1日あたりの最低出勤人数の確保 (ハード制約: 最低でも従業員総数の1/3以上、最低3人は出勤)
        daily_workers = sum(x[(e_idx, d, s_idx)] for e_idx in range(len(employees)) for s_idx in range(num_shifts) if s_idx != off_idx)
        min_daily_staff = max(3, len(employees) // 3)
        model.Add(daily_workers >= min_daily_staff)

        # 1日あたりの登録販売者の配置要求 (優先度: 2000点)
        for block in range(1, 11):
            covering_vars = []
            for e_idx in rs_indices:
                for s_id, blocks in shift_coverage.items():
                    if block in blocks and s_id in shift_ids:
                        s_idx = shift_ids.index(s_id)
                        covering_vars.append(x[(e_idx, d, s_idx)])
            
            covered = model.NewBoolVar(f'covered_rs_{d}_{block}')
            if covering_vars:
                model.Add(sum(covering_vars) >= 1).OnlyEnforceIf(covered)
                model.Add(sum(covering_vars) == 0).OnlyEnforceIf(covered.Not())
            else:
                model.Add(covered == 0)
            objective_terms.append(2000 * covered)

        # 優先順位の調整: ユーザーがフロントエンドから指定した曜日の手動優先度を反映
        day_weight = 0
        if input_data.weekday_weights:
            w_key = str(weekday)
            if w_key in input_data.weekday_weights:
                # ユーザーの指定値 (-2〜+3) をそのまま微調整タイブレーカーとして使用
                day_weight += int(input_data.weekday_weights[w_key])
        else:
            if weekday == 6: day_weight += 2         # 日曜日: デフォルト微増
            elif weekday == 0: day_weight -= 1       # 月曜日: デフォルト微減

        if d >= num_days - 4: day_weight += 2        # 月末: 微増
        if (d + 1) in input_data.thick_staffing_days: day_weight += 5 # 特売指定日: やや増

        if day_weight != 0:
            for e_idx in range(len(employees)):
                for s_idx in range(num_shifts):
                    if s_idx != off_idx:
                        objective_terms.append(day_weight * x[(e_idx, d, s_idx)])
                        
        if weekday in [1, 2]:
            for s_id in ['①', '②', '③', '④']:
                if s_id in shift_ids:
                    s_idx = shift_ids.index(s_id)
                    for e_idx in range(len(employees)):
                        objective_terms.append(1 * x[(e_idx, d, s_idx)])
                        
        if weekday == 5:
            for s_id in ['⑦', '⑧', '⑨', '⑩', '⑪']:
                if s_id in shift_ids:
                    s_idx = shift_ids.index(s_id)
                    for e_idx in range(len(employees)):
                        objective_terms.append(1 * x[(e_idx, d, s_idx)])

    if objective_terms:
        model.Maximize(sum(objective_terms))

    solver = cp_model.CpSolver()
    # 探索のマルチスレッド化（Portfolio Search）を有効にして、複雑なパズルでも即座に実現可能な解を見つけやすくする
    solver.parameters.num_search_workers = 8
    # サーバーのタイムアウト上限ギリギリまで計算時間を延長
    solver.parameters.max_time_in_seconds = 25.0
    status = solver.Solve(model)
    
    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        result_shifts = {}
        for e_idx, emp in enumerate(employees):
            emp_shifts = []
            for d in range(num_days):
                for s_idx, s_id in enumerate(shift_ids):
                    if solver.Value(x[(e_idx, d, s_idx)]) == 1:
                        emp_shifts.append(s_id if s_id != 'OFF' else '休')
            result_shifts[emp.id] = emp_shifts
        return {"status": "SUCCESS", "shifts": result_shifts, "score": 100}
    else:
        return {"status": "FAILED", "shifts": {}, "score": 0, "message": "制約が厳しすぎるためシフトを作成できませんでした。希望休や登録販売者の数を確認してください。"}
