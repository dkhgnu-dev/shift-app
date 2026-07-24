"""
Cycle 2 Take2/Take3 恒久回帰テスト。

Take2差し戻し(docs/handoff/P4_Rollback/cycle_2_review_take2.md)と
Take3差し戻し(docs/handoff/P4_Rollback/cycle_2_review_take3.md)で
指摘されたシナリオを、再実行可能なテストとして固定する。

使い方:
    cd backend
    python test_cycle2_take2.py
"""
import sys

from models import ShiftInput
from shift_solver import solve_shift

SHIFT_MASTER = {
    '①': '8:15~12:15', '②': '8:15~14:15', '③': '8:15~16:15',
    '④': '8:15~17:30', '⑤': '11:00~19:00', '⑥': '14:00~19:00', '⑦': '15:30~24:00', '⑧': '17:00~24:00',
    '⑨': '17:00~22:00', '⑩': '19:00~24:00', '⑪': '21:00~24:00',
}
SHIFT_TYPES = [
    {'id': k, 'start_time': v.split('~')[0], 'end_time': v.split('~')[1], 'is_special': False}
    for k, v in SHIFT_MASTER.items()
]
SPECIAL_TYPES = [
    {'id': sid, 'start_time': '0:00', 'end_time': '0:00', 'is_special': True}
    for sid in ['有休', '応援', '店長会', '研修', '勉強会', '公休']
]

INITIAL_DATA = [
    ('K.D.', '正社員', True, 23, ['④', '⑦']),
    ('N.E.', '時間限定社員', True, 23, ['④']),
    ('N.K.', '正社員', True, 23, ['④', '⑦']),
    ('T.S.', '準社員', False, 23, ['④']),
    ('S.M.', '準社員', False, 23, ['④']),
    ('J.R.', '準社員', False, 23, ['⑦']),
    ('O.T.', '早ロングパート', False, 20, ['③']),
    ('K.T.', '早ロングパート', False, 20, ['③']),
    ('T.Y.', '中ロングパート', False, 20, ['⑤']),
    ('T.M.(1)', '遅ロングパート', False, 20, ['⑧']),
    ('O.K.', '早パート', False, 16, ['②']),
    ('T.M.(2)', '早パート', False, 16, ['①']),
    ('I.K.(1)', '早パート', False, 16, ['①']),
    ('M.T.', '早パート', False, 16, ['①']),
    ('H.M.', '早パート', False, 16, ['①']),
    ('Y.M.', '中パート', False, 16, ['⑥']),
    ('Y.I.', '遅パート', False, 16, ['⑨']),
    ('K.Y.', '遅パート', False, 16, ['⑨']),
    ('M.R.', '遅パート', False, 16, ['⑨']),
    ('O.Y.', '遅パート', False, 16, ['⑩']),
    ('I.H.', '遅パート', False, 16, ['⑩']),
    ('T.A.', '遅パート', False, 16, ['⑩']),
    ('I.K.(2)', '遅パート', False, 16, ['⑪']),
    ('N.H.', '遅パート', False, 16, ['⑪']),
]
EMPLOYEES = [
    {'id': f'emp_{i}', 'name': n, 'employment_type': t, 'is_registered_seller': rs, 'contract_days': d, 'allowed_shifts': s}
    for i, (n, t, rs, d, s) in enumerate(INITIAL_DATA)
]
WEEKDAY_RANKS = {'6': 1, '5': 2, '1': 3, '2': 4, '4': 5, '3': 6, '0': 7}
WEEKDAY_MIN_STAFF = {'6': 0, '5': 0, '0': 0, '1': 0, '2': 0, '3': 0, '4': 0}

failures = []


def check(name, condition, detail=''):
    if condition:
        print(f'[OK] {name}')
    else:
        print(f'[NG] {name} {detail}')
        failures.append(name)


def build_full_payload(fixed_assignments=None, requests_off=None, employees=None, shift_types=None, allow_warning_draft=False):
    return {
        'year': 2026, 'month': 7,
        'employees': employees if employees is not None else EMPLOYEES,
        'shift_types': shift_types if shift_types is not None else (SHIFT_TYPES + SPECIAL_TYPES),
        'requests_off': requests_off or [],
        'thick_staffing_days': [],
        'weekday_ranks': WEEKDAY_RANKS,
        'weekday_min_staff': WEEKDAY_MIN_STAFF,
        'fixed_assignments': fixed_assignments or [],
        'allow_warning_draft': allow_warning_draft,
    }


# --- 1. fixed_assignmentsなしの既存ケース ---
def test_baseline_no_fixed():
    result = solve_shift(ShiftInput(**build_full_payload()))
    check('1. baseline: status=SUCCESS', result['status'] == 'SUCCESS', result['status'])
    check('1. baseline: phase1=OPTIMAL', result.get('phase1_status') == 'OPTIMAL', result.get('phase1_status'))


# --- 2. 固定通常・固定OFF・固定特殊が保持される ---
def test_fixed_values_preserved():
    fixed = [
        {'employee_id': 'emp_10', 'day_index': 3, 'shift_id': '②'},   # 固定通常
        {'employee_id': 'emp_3', 'day_index': 5, 'shift_id': 'OFF'},   # 固定OFF
        {'employee_id': 'emp_0', 'day_index': 1, 'shift_id': '有休'},  # 固定特殊
    ]
    result = solve_shift(ShiftInput(**build_full_payload(fixed_assignments=fixed)))
    shifts = result['shifts']
    check('2. 固定通常シフトが保持される', shifts['emp_10'][3] == '②', shifts['emp_10'][3])
    check('2. 固定OFFが保持される', shifts['emp_3'][5] == '休', shifts['emp_3'][5])
    check('2. 固定特殊シフトが保持される', shifts['emp_0'][1] == '有休', shifts['emp_0'][1])


# --- 3. INFEASIBLE時は通常出力を停止し、利用者選択時のみ警告仮シフトを返す ---
def test_infeasible_default_stops_and_lists_violations():
    # emp_0に対し、7日間連続で「休みなし」になるよう通常シフトを固定 → 新設の
    # 「7日間に最低1日は真の休み」ハード制約と矛盾させ、意図的にPhase1をINFEASIBLEにする。
    fixed = [{'employee_id': 'emp_0', 'day_index': d, 'shift_id': '④'} for d in range(7)]
    result = solve_shift(ShiftInput(**build_full_payload(fixed_assignments=fixed)))
    check('3a. 矛盾する固定割当はデフォルトでINFEASIBLEを返す(SUCCESS/FEASIBLE_WITH_WARNINGSにしない)', result['status'] == 'INFEASIBLE', result['status'])
    check('3a. INFEASIBLE時はshiftsが空(通常の表を返さない)', result['shifts'] == {}, result['shifts'])
    check('3a. violationsに具体的な理由が含まれる', len(result.get('violations', [])) > 0, result.get('violations'))


def test_infeasible_warning_draft_when_opted_in():
    fixed = [{'employee_id': 'emp_0', 'day_index': d, 'shift_id': '④'} for d in range(7)]
    result = solve_shift(ShiftInput(**build_full_payload(fixed_assignments=fixed, allow_warning_draft=True)))
    check('3b. allow_warning_draft指定時はFEASIBLE_WITH_WARNINGSを返す', result['status'] == 'FEASIBLE_WITH_WARNINGS', result['status'])
    check('3b. is_warning_draftフラグが立つ', result.get('is_warning_draft') is True, result.get('is_warning_draft'))
    check(
        '3b. 固定シフトは警告仮シフトでも保持される(黙って変更しない)',
        all(result['shifts'].get('emp_0', [None] * 7)[d] == '④' for d in range(7)),
        result['shifts'].get('emp_0', [])[:7]
    )
    check('3b. violationsに具体的な理由が含まれる', len(result.get('violations', [])) > 0, result.get('violations'))


# --- 4. fixedと強制希望休の衝突 ---
def test_fixed_vs_requested_off_conflict():
    requests_off = [{'employee_id': 'emp_5', 'date': '2026-06-20'}]  # period day_index=4 (6/16始まり)
    fixed = [{'employee_id': 'emp_5', 'day_index': 4, 'shift_id': '⑦'}]
    result = solve_shift(ShiftInput(**build_full_payload(fixed_assignments=fixed, requests_off=requests_off)))
    shifts = result['shifts']
    check('4. 衝突時は手動固定が優先される', shifts['emp_5'][4] == '⑦', shifts['emp_5'][4])
    conflict_warned = any('希望休が登録されています' in w for w in result['warnings'])
    check('4. 衝突がwarningとして記録される', conflict_warned, result['warnings'])


# --- 5. 期間外day、未知employee/shift、重複fixed ---
def test_invalid_fixed_assignments():
    fixed = [
        {'employee_id': 'emp_999', 'day_index': 0, 'shift_id': '④'},     # 未知employee
        {'employee_id': 'emp_0', 'day_index': 9999, 'shift_id': '④'},    # 期間外day
        {'employee_id': 'emp_0', 'day_index': 2, 'shift_id': '存在しないID'},  # 未知shift
        {'employee_id': 'emp_0', 'day_index': 3, 'shift_id': '④'},       # 重複1回目
        {'employee_id': 'emp_0', 'day_index': 3, 'shift_id': '⑦'},       # 重複2回目（後勝ち）
    ]
    result = solve_shift(ShiftInput(**build_full_payload(fixed_assignments=fixed)))
    check('5. クラッシュせずに応答が返る', result['status'] in ('SUCCESS', 'FEASIBLE_WITH_WARNINGS', 'INFEASIBLE'), result['status'])
    warn_text = ' '.join(result['warnings'])
    check('5. 未知employeeのwarningがある', '未知の従業員ID' in warn_text, warn_text)
    check('5. 期間外dayのwarningがある', '期間外の日付指定' in warn_text, warn_text)
    check('5. 未知shiftのwarningがある', '未知のシフトID' in warn_text, warn_text)
    check('5. 重複fixedのwarningがある', '重複した固定指定' in warn_text, warn_text)
    if result['status'] != 'INFEASIBLE':
        check('5. 重複fixedは後勝ちで⑦になる', result['shifts']['emp_0'][3] == '⑦', result['shifts']['emp_0'][3])


# --- 6. 特殊シフトの店舗人数・登録販売者カバレッジ除外、有休の勤務日数計上 ---
def test_special_shift_excluded_from_store_counts():
    # emp_0とemp_2はRS。emp_0を全期間「有休」に固定し、emp_2だけがRSカバレッジを担う状態にする。
    fixed = [{'employee_id': 'emp_0', 'day_index': d, 'shift_id': '有休'} for d in range(30)]
    result = solve_shift(ShiftInput(**build_full_payload(fixed_assignments=fixed)))
    check(
        '6. 特殊シフト固定でもクラッシュせず応答が返る',
        result['status'] in ('SUCCESS', 'FEASIBLE_WITH_WARNINGS', 'INFEASIBLE'),
        result['status']
    )
    if result['status'] != 'INFEASIBLE':
        check(
            '6. emp_0は全日「有休」のまま(店舗シフトへ自動割当されない)',
            all(s == '有休' for s in result['shifts']['emp_0']),
            set(result['shifts']['emp_0'])
        )
        warn_text = ' '.join(result['warnings'])
        check(
            '6. 有休は契約日数に算入される(不足warningが出ない)',
            not any('emp_0' in w or 'K.D.' in w and '不足' in w for w in result['warnings']),
            warn_text
        )


# --- 7. 公休・希望休・有休の確定仕様(Take3)テスト ---
def test_koukyuu_kibou_yukyu_confirmed_spec():
    # 正社員の実働5日+公休は実働連勤上限に抵触しない
    fixed_ft = [{'employee_id': 'emp_0', 'day_index': d, 'shift_id': '④'} for d in range(5)]
    fixed_ft.append({'employee_id': 'emp_0', 'day_index': 5, 'shift_id': '公休'})
    result_ft = solve_shift(ShiftInput(**build_full_payload(fixed_assignments=fixed_ft)))
    check('7-1. 正社員5実働+公休はINFEASIBLEにならない', result_ft['status'] != 'INFEASIBLE', result_ft['status'])

    # パート(実働上限4)の実働4日+公休は実働連勤上限に抵触しない
    fixed_pt = [{'employee_id': 'emp_10', 'day_index': d, 'shift_id': '②'} for d in range(4)]
    fixed_pt.append({'employee_id': 'emp_10', 'day_index': 4, 'shift_id': '公休'})
    result_pt = solve_shift(ShiftInput(**build_full_payload(fixed_assignments=fixed_pt)))
    check('7-2. パート4実働+公休はINFEASIBLEにならない', result_pt['status'] != 'INFEASIBLE', result_pt['status'])

    # 公休は契約勤務日数・勤務時間に算入されない(全日公休固定 → 契約日数不足のwarningになる)
    fixed_all_koukyuu = [{'employee_id': 'emp_0', 'day_index': d, 'shift_id': '公休'} for d in range(30)]
    result_koukyuu = solve_shift(ShiftInput(**build_full_payload(fixed_assignments=fixed_all_koukyuu)))
    check('7-3. 全日公休固定でもクラッシュせず応答が返る', result_koukyuu['status'] in ('SUCCESS', 'FEASIBLE_WITH_WARNINGS', 'INFEASIBLE'), result_koukyuu['status'])
    if result_koukyuu['status'] not in ('INFEASIBLE',):
        warn_text = ' '.join(result_koukyuu['warnings'])
        check('7-3. 公休は契約日数不足のwarningになる(勤務日数に算入されない)', '契約日数' in warn_text and '不足' in warn_text, warn_text)


def test_seven_day_rest_rule_scenarios():
    # 1. 6勤務+OFFは許可される(5連勤の既存上限に抵触しないよう、休みを中間に挟んで
    #    「5連勤→休み→1勤務」の計6勤務+1休み・7日間の形にする)
    payload1 = build_full_payload(
        fixed_assignments=(
            [{'employee_id': 'emp_0', 'day_index': d, 'shift_id': '④'} for d in range(5)]
            + [{'employee_id': 'emp_0', 'day_index': 6, 'shift_id': '④'}]
        ),
        requests_off=[{'employee_id': 'emp_0', 'date': '2026-06-21'}]  # day_index=5
    )
    result1 = solve_shift(ShiftInput(**payload1))
    check('7day-1. 6勤務+OFF(休み中間)は許可される(INFEASIBLEにならない)', result1['status'] != 'INFEASIBLE', result1['status'])

    # 2. 7日連続勤務(真の休みなし)は拒否される
    fixed2 = [{'employee_id': 'emp_0', 'day_index': d, 'shift_id': '④'} for d in range(7)]
    result2 = solve_shift(ShiftInput(**build_full_payload(fixed_assignments=fixed2)))
    check('7day-2. 7日連続勤務はデフォルトでINFEASIBLE', result2['status'] == 'INFEASIBLE', result2['status'])

    # 3. 4勤務+有休+2勤務(計7日、真の休みなし)は拒否される
    fixed3 = [{'employee_id': 'emp_0', 'day_index': d, 'shift_id': '④'} for d in range(4)]
    fixed3.append({'employee_id': 'emp_0', 'day_index': 4, 'shift_id': '有休'})
    fixed3 += [{'employee_id': 'emp_0', 'day_index': d, 'shift_id': '④'} for d in range(5, 7)]
    result3 = solve_shift(ShiftInput(**build_full_payload(fixed_assignments=fixed3)))
    check('7day-3. 4勤務+有休+2勤務(真の休みなし)はINFEASIBLE', result3['status'] == 'INFEASIBLE', result3['status'])

    # 4. 途中に公休がある7日窓は許可される
    fixed4 = [{'employee_id': 'emp_0', 'day_index': d, 'shift_id': '④'} for d in range(3)]
    fixed4.append({'employee_id': 'emp_0', 'day_index': 3, 'shift_id': '公休'})
    fixed4 += [{'employee_id': 'emp_0', 'day_index': d, 'shift_id': '④'} for d in range(4, 7)]
    result4 = solve_shift(ShiftInput(**build_full_payload(fixed_assignments=fixed4)))
    check('7day-4. 途中に公休がある7日窓は許可される', result4['status'] != 'INFEASIBLE', result4['status'])

    # 5. 期間末尾(30日期間の最後の7日)を含む窓も検証: 全日実働固定で拒否されること
    fixed5 = [{'employee_id': 'emp_1', 'day_index': d, 'shift_id': '④'} for d in range(23, 30)]
    result5 = solve_shift(ShiftInput(**build_full_payload(fixed_assignments=fixed5)))
    check('7day-5. 期間末尾7日間の連続勤務もINFEASIBLE', result5['status'] == 'INFEASIBLE', result5['status'])


# --- 8. employee ID / shift ID の整合性検証 ---
def test_id_integrity_validation():
    dup_emp_employees = [dict(e) for e in EMPLOYEES]
    dup_emp_employees[1] = dict(dup_emp_employees[1])
    dup_emp_employees[1]['id'] = dup_emp_employees[0]['id']
    try:
        solve_shift(ShiftInput(**build_full_payload(employees=dup_emp_employees)))
        check('8. 重複employee IDはエラーになる', False, '例外が発生しなかった')
    except ValueError as e:
        check('8. 重複employee IDはエラーになる', '従業員IDが重複' in str(e), str(e))

    dup_shift_types = SHIFT_TYPES + SPECIAL_TYPES + [dict(SHIFT_TYPES[0])]
    try:
        solve_shift(ShiftInput(**build_full_payload(shift_types=dup_shift_types)))
        check('8. 重複shift IDはエラーになる', False, '例外が発生しなかった')
    except ValueError as e:
        check('8. 重複shift IDはエラーになる', 'シフトIDが重複' in str(e), str(e))

    off_reserved = SHIFT_TYPES + SPECIAL_TYPES + [{'id': 'OFF', 'start_time': '0:00', 'end_time': '0:00', 'is_special': False}]
    try:
        solve_shift(ShiftInput(**build_full_payload(shift_types=off_reserved)))
        check('8. 予約ID"OFF"はエラーになる', False, '例外が発生しなかった')
    except ValueError as e:
        check('8. 予約ID"OFF"はエラーになる', 'OFF' in str(e), str(e))


if __name__ == '__main__':
    test_baseline_no_fixed()
    test_fixed_values_preserved()
    test_infeasible_default_stops_and_lists_violations()
    test_infeasible_warning_draft_when_opted_in()
    test_fixed_vs_requested_off_conflict()
    test_invalid_fixed_assignments()
    test_special_shift_excluded_from_store_counts()
    test_koukyuu_kibou_yukyu_confirmed_spec()
    test_seven_day_rest_rule_scenarios()
    test_id_integrity_validation()

    print()
    if failures:
        print(f'FAILED: {len(failures)} check(s) failed -> {failures}')
        sys.exit(1)
    else:
        print('ALL CYCLE2 TAKE2/TAKE3 REGRESSION TESTS PASSED')
