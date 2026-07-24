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
        if getattr(s, 'is_special', False):
            # 特殊シフト(有休/応援/店長会/研修/勉強会等)は店舗の時間帯カバレッジに寄与しない
            coverage[s.id] = []
            continue
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
    off_idx = shift_ids.index('OFF')

    # 特殊シフト(有休/応援/店長会/研修/勉強会等): 個人の勤務日数には計上するが、
    # 店舗出勤人数・登録販売者カバレッジからは除外する。ソルバーが空欄セルへ
    # 自動的に割り当てることはなく、fixed_assignments経由でのみ設定される。
    special_ids = {s.id for s in shifts if getattr(s, 'is_special', False)}
    special_indices = {shift_ids.index(sid) for sid in special_ids if sid in shift_ids}

    # 有休(法令上の連勤カウント対象)・公休(真の休みとして扱う特殊シフト)の位置
    yukyu_idx = shift_ids.index('有休') if '有休' in shift_ids else None
    koukyuu_idx = shift_ids.index('公休') if '公休' in shift_ids else None
    # 「7日間に最低1日は真の休みが必要」というハード制約で"休み"とみなすシフト
    rest_indices = {off_idx}
    if koukyuu_idx is not None:
        rest_indices.add(koukyuu_idx)
    # 5連勤/4連勤の「実働」上限カウント対象（有休は休みとして扱い除外。OFF以外の
    # 通常シフト・応援/店長会/研修/勉強会等は引き続き"勤務"として数える）
    real_work_indices = [s_idx for s_idx in range(num_shifts) if s_idx != off_idx and s_idx != yukyu_idx]

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

    # 「空欄自動作成」用の固定割当（既に手動入力されているセルを求解対象から除外する）
    # 不正な入力（未知の従業員/シフトID、期間外の日付、同一セルの重複）は黙って捨てず、
    # warningとして記録する。
    employee_ids = {e.id for e in employees}
    validation_warnings = []
    fixed_map = {}
    seen_fixed_keys = set()
    for fa in input_data.fixed_assignments:
        if fa.employee_id not in employee_ids:
            validation_warnings.append(f"不正な固定割当: 未知の従業員ID「{fa.employee_id}」を無視しました。")
            continue
        if fa.day_index < 0 or fa.day_index >= num_days:
            validation_warnings.append(f"不正な固定割当: 「{fa.employee_id}」の期間外の日付指定(day_index={fa.day_index})を無視しました。")
            continue
        if fa.shift_id not in shift_ids:
            validation_warnings.append(f"不正な固定割当: 「{fa.employee_id}」の未知のシフトID「{fa.shift_id}」を無視しました。")
            continue
        key = (fa.employee_id, fa.day_index)
        if key in seen_fixed_keys:
            warn_date = start_date + datetime.timedelta(days=fa.day_index)
            validation_warnings.append(f"不正な固定割当: 「{fa.employee_id}」の{warn_date.month}/{warn_date.day}に重複した固定指定があったため、後の指定を優先しました。")
        seen_fixed_keys.add(key)
        fixed_map[key] = shift_ids.index(fa.shift_id)

    # 手動固定と強制希望休が同一セルで衝突した場合は、手動固定（より新しい・明示的な操作）を
    # 優先する。ただし黙って処理せず、必ずwarningとして残す。
    conflict_warnings = []
    for (emp_id, d) in sorted(requested_off):
        if (emp_id, d) in fixed_map and shift_ids[fixed_map[(emp_id, d)]] != 'OFF':
            emp_obj = next((e for e in employees if e.id == emp_id), None)
            emp_label = emp_obj.name if emp_obj else emp_id
            warn_date = start_date + datetime.timedelta(days=d)
            fixed_label = shift_ids[fixed_map[(emp_id, d)]]
            conflict_warnings.append(
                f"{emp_label}さん: {warn_date.month}/{warn_date.day}は希望休が登録されていますが、"
                f"手動固定「{fixed_label}」を優先しました。"
            )

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
        # 可シフトの判定 (IDと一致するもの。空の場合は全シフト可。特殊シフトは対象外)
        allowed_s_indices = [shift_ids.index(s_id) for s_id in emp.allowed_shifts if s_id in shift_ids and s_id not in special_ids]
        if not allowed_s_indices:
            allowed_s_indices = [i for i, s_id in enumerate(shift_ids) if s_id != 'OFF' and s_id not in special_ids]

        for d in range(num_days):
            # 1日1シフト
            model.AddExactlyOne([x[(e_idx, d, s_idx)] for s_idx in range(num_shifts)])

            is_fixed_today = (emp.id, d) in fixed_map
            fixed_s_idx = fixed_map.get((emp.id, d))

            # 不可シフト禁止（固定セルとして指定された値は例外として許可する）
            for s_idx in range(num_shifts):
                if s_idx == off_idx:
                    continue
                if is_fixed_today and s_idx == fixed_s_idx:
                    continue
                if s_idx in special_indices:
                    # 特殊シフト(有休等)はソルバーが空欄セルへ自動割当することはない
                    model.Add(x[(e_idx, d, s_idx)] == 0)
                elif s_idx not in allowed_s_indices:
                    model.Add(x[(e_idx, d, s_idx)] == 0)

            if is_fixed_today:
                # 「空欄自動作成」: 既に手動入力済みのセルは固定条件として求解対象から除外
                model.Add(x[(e_idx, d, fixed_s_idx)] == 1)
            elif (emp.id, d) in requested_off:
                # 【絶対ルール】希望休は絶対厳守 (ハード制約)
                model.Add(x[(e_idx, d, off_idx)] == 1)

        # 【連勤・連休制限ルール】
        is_full_time = emp.employment_type in ['正社員', '時間限定社員', '準社員']

        if is_full_time:
            # --- 正社員・準社員 ---
            # 1) 連勤上限: 最大5連勤 (6連勤以上は絶対禁止) ← ハード制約（有休は休みとして除外）
            for start_d in range(num_days - 5):
                model.Add(sum(
                    x[(e_idx, d, s_idx)]
                    for d in range(start_d, start_d + 6)
                    for s_idx in real_work_indices
                ) <= 5)
            # 2) 5連勤を極力避ける ← ソフト制約（有休は休みとして除外）
            for start_d in range(num_days - 4):
                five_consec = model.NewBoolVar(f'five_consec_{emp.id}_{start_d}')
                work_5 = sum(
                    x[(e_idx, d, s_idx)]
                    for d in range(start_d, start_d + 5)
                    for s_idx in real_work_indices
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
            # 1) 連勤上限: 最大4连勤 (5連勤以上は絶対禁止) ← ハード制約（有休は休みとして除外）
            for start_d in range(num_days - 4):
                model.Add(sum(
                    x[(e_idx, d, s_idx)]
                    for d in range(start_d, start_d + 5)
                    for s_idx in real_work_indices
                ) <= 4)
            # 2) 4連勤を極力避ける ← ソフト制約（有休は休みとして除外）
            for start_d in range(num_days - 3):
                four_consec = model.NewBoolVar(f'four_consec_{emp.id}_{start_d}')
                work_4 = sum(
                    x[(e_idx, d, s_idx)]
                    for d in range(start_d, start_d + 4)
                    for s_idx in real_work_indices
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

        # 【法令ルール・全雇用形態共通】7日間の窓の中で真の休み(OFF/公休)が最低1日必要 ← ハード制約
        # 有休はこの上限では「出勤扱い」としてカウントする（有休を挟んでも休みなし連続稼働を無制限にはできない）。
        # 例:「4連勤+有休+4連勤」のように実働の連勤上限(5/4連勤)を個別には満たしていても、
        # 合計9日間・真の休みなしとなる組み合わせは、この制約により禁止される。
        for start_d in range(num_days - 6):
            window = range(start_d, start_d + 7)
            rest_sum = sum(
                x[(e_idx, d, s_idx)]
                for d in window
                for s_idx in rest_indices
            )
            model.Add(rest_sum >= 1)

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
        daily_workers = sum(x[(e_idx, d, s_idx)] for e_idx in range(len(employees)) for s_idx in range(num_shifts) if s_idx != off_idx and s_idx not in special_indices)

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
    solver.parameters.max_time_in_seconds = 10.0
    phase1_status = solver.Solve(model)
    status = phase1_status
    phase2_status = None

    def snapshot():
        """現在のsolver状態から結果復元に必要な値だけを取り出す（フェーズ2失敗時のフォールバック用）"""
        return {
            'x': {k: solver.Value(v) for k, v in x.items()},
            'slack_contract': {emp_id: (solver.Value(su), solver.Value(so)) for emp_id, (su, so) in slack_contract.items()},
            'slack_rs': {k: solver.Value(v) for k, v in slack_rs.items()},
        }

    final_values = None

    if phase1_status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
        # フェーズ1解のスナップショットを必ず確保しておく（フェーズ2が解を返せなかった場合のフォールバック用）
        phase1_snapshot = snapshot()
        final_values = phase1_snapshot

        # 連勤ペナルティ係数: 15（1連勤発生 = 目標人数ズレ15人分のコスト）
        consec_penalty_sum = sum(15 * v for v in consec_penalty_vars) if consec_penalty_vars else 0

        if phase1_status == cp_model.OPTIMAL:
            # OPTIMAL（証明済み最小スラック）の場合のみ、以降のフェーズでスラックを悪化させない
            # ハード制約として固定してよい。
            best_slack = solver.Value(sum(total_slack))
            model.Add(sum(total_slack) <= best_slack)
            model.Minimize(sum(target_diff_vars) + consec_penalty_sum)
        else:
            # FEASIBLE（未証明の暫定解）の場合、この時点のスラックを固定してしまうと
            # 「本当はもっと減らせたはずのスラック」が確定してしまう。
            # そのためフェーズ2でも total_slack を圧倒的に大きい重みで目的関数に含め、
            # 曜日目標人数や連勤抑制より優先してスラック削減を継続させる。
            model.Minimize(100000 * sum(total_slack) + sum(target_diff_vars) + consec_penalty_sum)

        solver.parameters.max_time_in_seconds = 15.0
        phase2_status = solver.Solve(model)

        if phase2_status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            final_values = snapshot()
        # else: フェーズ2が解を返さなかった場合は phase1_snapshot のまま（フォールバック）

    warnings = list(validation_warnings) + list(conflict_warnings)

    # 絶対失敗しない安全フォールバック（フェーズ1自体が解なしの場合のみ）
    # 手動固定されたセル（通常シフト・OFF・特殊シフトいずれも）は必ず保持し、
    # 空欄セルのみデフォルト値で埋める。特殊シフトを空欄へ自動割当することはない。
    if phase1_status not in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
        warnings.append("⚠️ 条件の自動計算が困難だったため基本仮シフトを構築しました。従業員の契約日数や希望休の重複をご確認ください。")
        fallback_shifts = {}
        for emp in employees:
            allowed = [s_id for s_id in emp.allowed_shifts if s_id in shift_ids and s_id not in special_ids]
            if not allowed:
                allowed = [s.id for s in shifts if s.id != 'OFF' and s.id not in special_ids]
            default_shift = allowed[0] if allowed else 'OFF'
            emp_s = []
            for d in range(num_days):
                if (emp.id, d) in fixed_map:
                    fixed_id = shift_ids[fixed_map[(emp.id, d)]]
                    emp_s.append('休' if fixed_id == 'OFF' else fixed_id)
                elif (emp.id, d) in requested_off:
                    emp_s.append('休')
                else:
                    emp_s.append('休' if default_shift == 'OFF' else default_shift)
            fallback_shifts[emp.id] = emp_s
        return {
            "status": "FEASIBLE_WITH_WARNINGS",
            "shifts": fallback_shifts,
            "score": 50,
            "warnings": warnings,
            "message": warnings[0]
        }

    # スラック値のチェックと警告生成（フェーズ2が有効ならその結果、無効ならフェーズ1解を使用）
    for emp in employees:
        u_val, o_val = final_values['slack_contract'][emp.id]
        if u_val > 0:
            warnings.append(f"{emp.name}さん: 契約日数({emp.contract_days}日)に対して割り当てが{u_val}日不足しています。")
        elif o_val > 0:
            warnings.append(f"{emp.name}さん: 契約日数({emp.contract_days}日)に対して割り当てが{o_val}日超過しています。")

    for (d, block), s_rs_val in final_values['slack_rs'].items():
        if s_rs_val == 1:
            warn_date = start_date + datetime.timedelta(days=d)
            warnings.append(f"{warn_date.month}/{warn_date.day}: 時間帯ブロック{block}で登録販売者が不足しています。")

    # ※ slack_daily_staff の警告は廃止（ハード制約化により違反は発生しない）

    result_shifts = {}
    for e_idx, emp in enumerate(employees):
        emp_shifts = []
        for d in range(num_days):
            for s_idx, s_id in enumerate(shift_ids):
                if final_values['x'][(e_idx, d, s_idx)] == 1:
                    emp_shifts.append(s_id if s_id != 'OFF' else '休')
        result_shifts[emp.id] = emp_shifts

    status_str = "SUCCESS" if len(warnings) == 0 else "FEASIBLE_WITH_WARNINGS"

    return {
        "status": status_str,
        "shifts": result_shifts,
        "score": 100 if len(warnings) == 0 else 80,
        "warnings": warnings,
        "message": warnings[0] if warnings else None,
        "phase1_status": solver.StatusName(phase1_status),
        "phase2_status": solver.StatusName(phase2_status) if phase2_status is not None else None
    }
