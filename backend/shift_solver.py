from ortools.sat.python import cp_model
from models import ShiftInput
import datetime
import math

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
        try:
            req_date = datetime.date.fromisoformat(req.date)
            day_index = (req_date - start_date).days
            requested_off.add((req.employee_id, day_index))
        except (IndexError, ValueError):
            pass

    # 変数定義
    x = {}
    for e_idx, emp in enumerate(employees):
        for d in range(num_days):
            for s_idx, s_id in enumerate(shift_ids):
                x[(e_idx, d, s_idx)] = model.NewBoolVar(f'shift_{emp.id}_{d}_{s_id}')

    # --- スラック変数 (診断用ソフト制約) ---
    slack_contract = {}    # 契約日数のズレ
    slack_rs = {}          # 登販不足
    # ※ slack_daily_staff は廃止。±1名制限はハード制約に昇格済み。
    consec_penalty_vars = []  # 連勤ソフト制約ペナルティ変数

    # 1. 各従業員の基本制約
    for e_idx, emp in enumerate(employees):
        # 可シフトの判定 (IDと一致するもの。空の場合は全シフト可)
        allowed_s_indices = [shift_ids.index(s_id) for s_id in emp.allowed_shifts if s_id in shift_ids]
        if not allowed_s_indices:
            allowed_s_indices = [i for i, s_id in enumerate(shift_ids) if s_id != 'OFF']

        off_idx = shift_ids.index('OFF')

        for d in range(num_days):
            # 1日1シフト
            model.AddExactlyOne([x[(e_idx, d, s_idx)] for s_idx in range(num_shifts)])

            # 不可シフト禁止
            for s_idx in range(num_shifts):
                if s_idx != off_idx and s_idx not in allowed_s_indices:
                    model.Add(x[(e_idx, d, s_idx)] == 0)

            # 【絶対ルール】希望休は絶対厳守 (ハード制約)
            if (emp.id, d) in requested_off:
                model.Add(x[(e_idx, d, off_idx)] == 1)

        # 【連勤・連休制限ルール】
        is_full_time = emp.employment_type in ['正社員', '時間限定社員', '準社員']

        if is_full_time:
            # --- 正社員・準社員 ---
            # 1) 連勤上限: 最大5連勤 (6連勤以上は絶対禁止) ← ハード制約
            for start_d in range(num_days - 5):
                model.Add(sum(
                    x[(e_idx, d, s_idx)]
                    for d in range(start_d, start_d + 6)
                    for s_idx in range(num_shifts) if s_idx != off_idx
                ) <= 5)
            # 2) 5連勤を極力避ける ← ソフト制約
            for start_d in range(num_days - 4):
                five_consec = model.NewBoolVar(f'five_consec_{emp.id}_{start_d}')
                work_5 = sum(
                    x[(e_idx, d, s_idx)]
                    for d in range(start_d, start_d + 5)
                    for s_idx in range(num_shifts) if s_idx != off_idx
                )
                model.Add(work_5 >= 5).OnlyEnforceIf(five_consec)
                model.Add(work_5 <= 4).OnlyEnforceIf(five_consec.Not())
                consec_penalty_vars.append(five_consec)

            # 3) 連休制限: 最大2連休まで（希望休を除く自動3連休以上は絶対禁止） ← ハード制約
            for start_d in range(num_days - 2):
                window = range(start_d, start_d + 3)
                non_auto_off_terms = []
                for d in window:
                    if (emp.id, d) in requested_off:
                        non_auto_off_terms.append(1)
                    else:
                        work_var = sum(x[(e_idx, d, s_idx)] for s_idx in range(num_shifts) if s_idx != off_idx)
                        non_auto_off_terms.append(work_var)
                model.Add(sum(non_auto_off_terms) >= 1)
        else:
            # --- パート・アルバイト等 ---
            # 1) 連勤上限: 最大4连勤 (5連勤以上は絶対禁止) ← ハード制約
            for start_d in range(num_days - 4):
                model.Add(sum(
                    x[(e_idx, d, s_idx)]
                    for d in range(start_d, start_d + 5)
                    for s_idx in range(num_shifts) if s_idx != off_idx
                ) <= 4)
            # 2) 4連勤を極力避ける ← ソフト制約
            for start_d in range(num_days - 3):
                four_consec = model.NewBoolVar(f'four_consec_{emp.id}_{start_d}')
                work_4 = sum(
                    x[(e_idx, d, s_idx)]
                    for d in range(start_d, start_d + 4)
                    for s_idx in range(num_shifts) if s_idx != off_idx
                )
                model.Add(work_4 >= 4).OnlyEnforceIf(four_consec)
                model.Add(work_4 <= 3).OnlyEnforceIf(four_consec.Not())
                consec_penalty_vars.append(four_consec)

            # 3) 連休制限: 5連休以上は絶対禁止（希望休を除く） ← ハード制約
            for start_d in range(num_days - 4):
                window = range(start_d, start_d + 5)
                non_auto_off_terms = []
                for d in window:
                    if (emp.id, d) in requested_off:
                        non_auto_off_terms.append(1)
                    else:
                        work_var = sum(x[(e_idx, d, s_idx)] for s_idx in range(num_shifts) if s_idx != off_idx)
                        non_auto_off_terms.append(work_var)
                model.Add(sum(non_auto_off_terms) >= 1)

            # 4) 連休制限: 4連休を極力避ける（希望休を除く） ← ソフト制約
            for start_d in range(num_days - 3):
                window = range(start_d, start_d + 4)
                has_req_off = any((emp.id, d) in requested_off for d in window)
                if not has_req_off:
                    four_consec_off = model.NewBoolVar(f'four_consec_off_{emp.id}_{start_d}')
                    work_4_days = sum(
                        x[(e_idx, d, s_idx)]
                        for d in window
                        for s_idx in range(num_shifts) if s_idx != off_idx
                    )
                    model.Add(work_4_days == 0).OnlyEnforceIf(four_consec_off)
                    model.Add(work_4_days >= 1).OnlyEnforceIf(four_consec_off.Not())
                    consec_penalty_vars.append(four_consec_off)

        # 契約日数遵守 (スラック付き)
        working_days = sum(x[(e_idx, d, s_idx)] for d in range(num_days) for s_idx in range(num_shifts) if s_idx != off_idx)
        slack_under = model.NewIntVar(0, num_days, f'slack_under_{emp.id}')
        slack_over = model.NewIntVar(0, num_days, f'slack_over_{emp.id}')
        model.Add(working_days + slack_under - slack_over == emp.contract_days)
        slack_contract[emp.id] = (slack_under, slack_over)

    # 2. 人数制限と登録販売者カバレッジ（時間帯ブロックはshift_typesから動的判定）
    shift_coverage = build_shift_coverage(shifts)

    total_contract_days = sum(emp.contract_days for emp in employees)
    avg_daily_staff = (total_contract_days / num_days) if num_days > 0 else 1.0
    base_avg = int(round(avg_daily_staff))
    if base_avg < 1:
        base_avg = 1

    # 「±1名以内」の厳格制限（ハード制約枠）
    min_allowed = max(1, base_avg - 1)
    max_allowed = base_avg + 1
    max_by_percentage = math.ceil(len(employees) * 0.7)
    if max_allowed > max_by_percentage and max_by_percentage >= min_allowed:
        max_allowed = max_by_percentage

    # 各日の目標出勤人数をモデル作成前に確定（16日〜15日締め期間の実日付ベース）
    target_for_days = []
    lottery_days_count = 5 if input_data.month in [7, 12] else 4
    for d in range(num_days):
        current_date = start_date + datetime.timedelta(days=d)
        weekday = current_date.weekday()

        # 曜日順位による目標人数の決定
        # 🥇 1位〜2位（上位）： 平均 +1名
        # ⚪ 3位〜5位（中位）： 平均 ピッタリ
        # 🔴 6位〜7位（下位）： 平均 -1名
        target_for_day = base_avg
        if input_data.weekday_ranks:
            w_key = str(weekday)
            if w_key in input_data.weekday_ranks:
                rank = int(input_data.weekday_ranks[w_key])
                if rank in [1, 2]:
                    target_for_day = base_avg + 1
                elif rank in [6, 7]:
                    target_for_day = base_avg - 1
                else:
                    target_for_day = base_avg
        else:
            if weekday == 6:
                target_for_day = base_avg + 1
            elif weekday == 0:
                target_for_day = base_avg - 1

        # 特売日や月末抽選会の強化補正
        if (d + 1) in input_data.thick_staffing_days or d >= (num_days - lottery_days_count):
            target_for_day += 1

        target_for_day = max(min_allowed, min(max_allowed, target_for_day))
        target_for_days.append(target_for_day)

    target_diff_vars = []
    for d in range(num_days):
        current_date = start_date + datetime.timedelta(days=d)
        weekday = current_date.weekday()
        daily_workers = sum(x[(e_idx, d, s_idx)] for e_idx in range(len(employees)) for s_idx in range(num_shifts) if s_idx != off_idx)

        # 曜日別最低出勤人数の適用（ハード制約）
        # weekday_min_staff が設定されていれば、base_avg-1 と比較して大きい方を採用
        day_min = min_allowed  # デフォルトは base_avg - 1
        if input_data.weekday_min_staff:
            w_min_key = str(weekday)
            if w_min_key in input_data.weekday_min_staff:
                user_min = int(input_data.weekday_min_staff[w_min_key])
                if user_min > 0:
                    # 上限 (max_allowed) を超えないようにクランプ
                    day_min = max(day_min, min(user_min, max_allowed))

        # 出勤人数上限・下限は「ハード制約」として直接固定（スラックなし）
        # → フェーズ1で均等配分に固定されることなく、フェーズ2の順位配分が機能する
        model.Add(daily_workers >= day_min)
        model.Add(daily_workers <= max_allowed)

        # 目標人数からの差分変数をモデル定義時に一括作成
        target_diff = model.NewIntVar(0, len(employees), f'target_diff_{d}')
        model.AddAbsEquality(target_diff, daily_workers - target_for_days[d])
        target_diff_vars.append(target_diff)

        # 登録販売者カバレッジ (スラック付き・動的ブロック判定)
        for block in range(1, 11):
            covering_vars = []
            for e_idx in rs_indices:
                for s_id, blocks in shift_coverage.items():
                    if block in blocks and s_id in shift_ids:
                        s_idx = shift_ids.index(s_id)
                        covering_vars.append(x[(e_idx, d, s_idx)])

            s_rs = model.NewBoolVar(f'slack_rs_{d}_{block}')
            slack_rs[(d, block)] = s_rs
            if covering_vars:
                model.Add(sum(covering_vars) >= 1).OnlyEnforceIf(s_rs.Not())
            else:
                model.Add(s_rs == 1)

    # === 辞書順最適化 (Lexicographic Optimization) ===

    # 【フェーズ 1】最優先: スラック（契約日数・登販不足）の最小化
    # ※ 均等化ペナルティは除外。±1名制限はハード制約のため不要。
    total_slack = []
    for (emp_id, (su, so)) in slack_contract.items():
        total_slack.append(100 * su + 100 * so)
    for rs_key, s_rs in slack_rs.items():
        total_slack.append(2000 * s_rs)

    model.Minimize(sum(total_slack))

    solver = cp_model.CpSolver()
    solver.parameters.num_search_workers = 8
    solver.parameters.max_time_in_seconds = 8.0
    status = solver.Solve(model)

    if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
        best_slack = solver.Value(sum(total_slack))
        model.Add(sum(total_slack) <= best_slack)

        # 【フェーズ 2】曜日目標人数の達成 ＋ 連勤抑制の統合最適化
        # 連勤ペナルティ係数: 15（1連勤発生 = 目標人数ズレ15人分のコスト）
        consec_penalty_sum = sum(15 * v for v in consec_penalty_vars) if consec_penalty_vars else 0
        model.Minimize(sum(target_diff_vars) + consec_penalty_sum)
        solver.parameters.max_time_in_seconds = 12.0
        solver.Solve(model)

    warnings = []

    # 絶対失敗しない安全フォールバック
    if status not in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
        warnings.append("⚠️ 条件の自動計算が困難だったため基本仮シフトを構築しました。従業員の契約日数や希望休の重複をご確認ください。")
        fallback_shifts = {}
        for emp in employees:
            allowed = emp.allowed_shifts if emp.allowed_shifts else [s.id for s in shifts if s.id != 'OFF']
            default_shift = allowed[0] if allowed else (shifts[0].id if shifts else '①')
            emp_s = []
            for d in range(num_days):
                if (emp.id, d) in requested_off:
                    emp_s.append('休')
                else:
                    emp_s.append(default_shift)
            fallback_shifts[emp.id] = emp_s
        return {
            "status": "FEASIBLE_WITH_WARNINGS",
            "shifts": fallback_shifts,
            "score": 50,
            "warnings": warnings,
            "message": warnings[0]
        }

    # スラック値のチェックと警告生成
    for emp in employees:
        su, so = slack_contract[emp.id]
        u_val = solver.Value(su)
        o_val = solver.Value(so)
        if u_val > 0:
            warnings.append(f"{emp.name}さん: 契約日数({emp.contract_days}日)に対して割り当てが{u_val}日不足しています。")
        elif o_val > 0:
            warnings.append(f"{emp.name}さん: 契約日数({emp.contract_days}日)に対して割り当てが{o_val}日超過しています。")

    for (d, block), s_rs in slack_rs.items():
        if solver.Value(s_rs) == 1:
            warn_date = start_date + datetime.timedelta(days=d)
            warnings.append(f"{warn_date.month}/{warn_date.day}: 時間帯ブロック{block}で登録販売者が不足しています。")

    # ※ slack_daily_staff の警告は廃止（ハード制約化により違反は発生しない）

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
