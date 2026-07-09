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
                
        # 優先3&4: 契約日数遵守 (月8日休みなどは契約日数に内包される)
        working_days = sum(x[(e_idx, d, s_idx)] for d in range(num_days) for s_idx in range(num_shifts) if s_idx != off_idx)
        model.Add(working_days == emp.contract_days)
        
        # 優先5: 6連勤以上禁止 (最大5連勤)
        for start_d in range(num_days - 5):
            model.Add(sum(
                x[(e_idx, d, s_idx)] 
                for d in range(start_d, start_d + 6) 
                for s_idx in range(num_shifts) if s_idx != off_idx
            ) <= 5)

    # 優先2: 登録販売者を営業時間中常時1名以上配置 (8:15〜24:00)
    # 時間帯をブロック分けしてカバレッジを計算
    # 1: 8:15-12:15, 2: 12:15-14:15, 3: 14:15-15:30, 4: 15:30-16:15, 5: 16:15-17:00
    # 6: 17:00-17:30, 7: 17:30-19:00, 8: 19:00-21:00, 9: 21:00-22:00, 10: 22:00-24:00
    shift_coverage = {
        '①': [1],
        '②': [1, 2],
        '③': [1, 2, 3, 4],
        '④': [1, 2, 3, 4, 5, 6],
        '⑤': [2, 3, 4, 5, 6, 7],
        '⑥': [3, 4, 5, 6, 7],
        '⑦': [4, 5, 6, 7, 8, 9, 10],
        '⑧': [6, 7, 8, 9, 10],
        '⑨': [6, 7, 8, 9],
        '⑩': [8, 9, 10],
        '⑪': [9, 10]
    }
    
    for d in range(num_days):
        for block in range(1, 11):
            # 全登録販売者の中で、このブロックをカバーするシフトに入っている人が1人以上いるか
            covering_vars = []
            for e_idx in rs_indices:
                for s_id, blocks in shift_coverage.items():
                    if block in blocks and s_id in shift_ids:
                        s_idx = shift_ids.index(s_id)
                        covering_vars.append(x[(e_idx, d, s_idx)])
            
            # 代替案を後で出せるように、一旦ハード制約で記述するが、
            # 現状は「必ず1人以上」を必須とする
            if covering_vars:
                model.Add(sum(covering_vars) >= 1)
            else:
                # そもそもそのブロックをカバーできるRSシフトが存在しない場合は破綻する
                # 警告として扱うが、OR-Tools上では充足不能になる
                pass

    # 目的関数 (Objective Function) - 優先順位 7, 8, 9 のスコア化
    objective_terms = []
    
    for d in range(num_days):
        current_date = datetime.date(input_data.year, input_data.month, d + 1)
        weekday = current_date.weekday() # 0: Mon, 1: Tue, 2: Wed, 3: Thu, 4: Fri, 5: Sat, 6: Sun
        
        day_weight = 0
        
        # 日曜日は1番多く (Maximize)
        if weekday == 6:
            day_weight += 10
        # 月曜日は1番少なく (Minimize)
        elif weekday == 0:
            day_weight -= 10
            
        # 月末最終日から前4日間は人員を全体的に多くする
        if d >= num_days - 4:
            day_weight += 15
            
        # 自分でも人員を厚くしてほしい日 (カスタム指定日)
        if (d + 1) in input_data.thick_staffing_days:
            day_weight += 20
            
        # その日の全従業員の出勤に対してウェイトを付与
        if day_weight != 0:
            for e_idx in range(len(employees)):
                for s_idx in range(num_shifts):
                    if s_idx != off_idx:
                        objective_terms.append(day_weight * x[(e_idx, d, s_idx)])
                        
        # 火曜日と水曜日は14時までの人員が多くなるように (早番強化)
        if weekday in [1, 2]:
            early_shifts = ['①', '②', '③', '④'] # 14時付近まで/跨ぐシフト
            for s_id in early_shifts:
                if s_id in shift_ids:
                    s_idx = shift_ids.index(s_id)
                    for e_idx in range(len(employees)):
                        objective_terms.append(5 * x[(e_idx, d, s_idx)])
                        
        # 土曜日は19時以降の人員が多くなるように (遅番強化)
        if weekday == 5:
            late_shifts = ['⑦', '⑧', '⑨', '⑩', '⑪'] # 19時以降を含むシフト
            for s_id in late_shifts:
                if s_id in shift_ids:
                    s_idx = shift_ids.index(s_id)
                    for e_idx in range(len(employees)):
                        objective_terms.append(5 * x[(e_idx, d, s_idx)])

    if objective_terms:
        model.Maximize(sum(objective_terms))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 15.0
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
