from ortools.sat.python import cp_model
from models import ShiftInput
import datetime

# 時間帯ブロック定義: (block_id, 開始分, 終了分)
BLOCK_DEFS = [
    (1, 495, 735), (2, 735, 855), (3, 855, 930), (4, 930, 975), (5, 975, 1020),
    (6, 1020, 1050), (7, 1050, 1140), (8, 1140, 1260), (9, 1260, 1320), (10, 1320, 1440),
]


def time_to_minutes(time_str: str) -> int:
    h, m = time_str.split(':')
    return int(h) * 60 + int(m)


def build_shift_coverage(shift_types):
    coverage = {}
    for s in shift_types:
        start_min = time_to_minutes(s.start_time)
        end_min = time_to_minutes(s.end_time)
        coverage[s.id] = [
            block_id for block_id, b_start, b_end in BLOCK_DEFS
            if start_min <= b_start and end_min >= b_end
        ]
    return coverage


def get_period_start(year: int, month: int) -> datetime.date:
    """前月16日〜当月15日締めの開始日を返す"""
    prev_month = month - 1
    prev_year = year
    if prev_month < 1:
        prev_month = 12
        prev_year -= 1
    return datetime.date(prev_year, prev_month, 16)


def get_period_end(year: int, month: int) -> datetime.date:
    return datetime.date(year, month, 15)


def solve_shift(input_data: ShiftInput):
    model = cp_model.CpModel()

    start_date = get_period_start(input_data.year, input_data.month)
    end_date = get_period_end(input_data.year, input_data.month)
    num_days = (end_date - start_date).days + 1
    employees = input_data.employees
    shifts = input_data.shift_types

    shift_ids = [s.id for s in shifts] + ['OFF']
    num_shifts = len(shift_ids)

    # 登録販売者 (RS)
    rs_indices = [i for i, e in enumerate(employees) if e.is_registered_seller]

    # 希望休の処理（日付文字列を期間内の通算インデックス(0始まり)に変換）
    requested_off = set()
    for req in input_data.requests_off:
        req_date = datetime.date.fromisoformat(req.date)
        day_index = (req_date - start_date).days
        requested_off.add((req.employee_id, day_index))
    
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
            if (emp.id, d) in requested_off:
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

    shift_coverage = build_shift_coverage(shifts)

    for d in range(num_days):
        current_date = start_date + datetime.timedelta(days=d)
        weekday = current_date.weekday()
        day_weight = 0
        if weekday == 6: day_weight += 10
        elif weekday == 0: day_weight -= 10
        if d >= num_days - 4: day_weight += 15
        if (d + 1) in input_data.thick_staffing_days: day_weight += 20

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
                        objective_terms.append(5 * x[(e_idx, d, s_idx)])
                        
        if weekday == 5:
            for s_id in ['⑦', '⑧', '⑨', '⑩', '⑪']:
                if s_id in shift_ids:
                    s_idx = shift_ids.index(s_id)
                    for e_idx in range(len(employees)):
                        objective_terms.append(5 * x[(e_idx, d, s_idx)])

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
