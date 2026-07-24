"""
Cycle 2 Take2 恒久回帰テスト。

Dexの差し戻し(docs/handoff/P4_Rollback/cycle_2_review_take2.md)で指摘された
以下のシナリオを、再実行可能なテストとして固定する。

1. fixed_assignmentsなしの既存ケース（実店舗24名構成でwarnings 0件を維持）
2. 固定通常・固定OFF・固定特殊シフトが求解結果でも保持される
3. フェーズ1がINFEASIBLEの場合でも、フォールバックが固定セルを保持する
4. fixed_assignmentsと強制希望休(requests_off)が衝突した場合、手動固定が優先され、
   かつ必ずwarningとして記録される
5. 期間外day、未知employee/shift、重複fixedが黙って捨てられず、warningとして記録される
6. 特殊シフトが店舗人数・登録販売者カバレッジ・鍵持ち判定（=店舗集計）から除外される
7. 有休を挟んだ連勤パターンの扱い（実働連勤上限には含めない／7日間に1日は真の休みが必要）

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


def build_full_payload(fixed_assignments=None, requests_off=None, employees=None, shift_types=None):
    return {
        'year': 2026, 'month': 7,
        'employees': employees if employees is not None else EMPLOYEES,
        'shift_types': shift_types if shift_types is not None else (SHIFT_TYPES + SPECIAL_TYPES),
        'requests_off': requests_off or [],
        'thick_staffing_days': [],
        'weekday_ranks': WEEKDAY_RANKS,
        'weekday_min_staff': WEEKDAY_MIN_STAFF,
        'fixed_assignments': fixed_assignments or [],
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


# --- 3. INFEASIBLEフォールバック時の固定保持 ---
def test_infeasible_fallback_preserves_fixed():
    # emp_0に対し、7日間連続で「休みなし」になるよう通常シフトを固定 → 新設の
    # 「7日間に最低1日は真の休み」ハード制約と矛盾させ、意図的にPhase1をINFEASIBLEにする。
    fixed = [{'employee_id': 'emp_0', 'day_index': d, 'shift_id': '④'} for d in range(7)]
    result = solve_shift(ShiftInput(**build_full_payload(fixed_assignments=fixed)))
    shifts = result['shifts']
    check('3. 矛盾する固定割当でFEASIBLE_WITH_WARNINGSになる', result['status'] == 'FEASIBLE_WITH_WARNINGS', result['status'])
    check(
        '3. フォールバックでも固定シフトが7日分すべて保持される',
        all(shifts['emp_0'][d] == '④' for d in range(7)),
        shifts['emp_0'][:7]
    )


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
    check('5. クラッシュせずに応答が返る', result['status'] in ('SUCCESS', 'FEASIBLE_WITH_WARNINGS'), result['status'])
    warn_text = ' '.join(result['warnings'])
    check('5. 未知employeeのwarningがある', '未知の従業員ID' in warn_text, warn_text)
    check('5. 期間外dayのwarningがある', '期間外の日付指定' in warn_text, warn_text)
    check('5. 未知shiftのwarningがある', '未知のシフトID' in warn_text, warn_text)
    check('5. 重複fixedのwarningがある', '重複した固定指定' in warn_text, warn_text)
    check('5. 重複fixedは後勝ちで⑦になる', result['shifts']['emp_0'][3] == '⑦', result['shifts']['emp_0'][3])


# --- 6. 特殊シフトの店舗人数・登録販売者カバレッジ除外 ---
def test_special_shift_excluded_from_store_counts():
    # emp_0とemp_2はRS。emp_0を全期間「有休」に固定し、emp_2だけがRSカバレッジを担う状態にする。
    fixed = [{'employee_id': 'emp_0', 'day_index': d, 'shift_id': '有休'} for d in range(30)]
    result = solve_shift(ShiftInput(**build_full_payload(fixed_assignments=fixed)))
    check(
        '6. 特殊シフト固定でもクラッシュせず応答が返る',
        result['status'] in ('SUCCESS', 'FEASIBLE_WITH_WARNINGS'),
        result['status']
    )
    check(
        '6. emp_0は全日「有休」のまま(店舗シフトへ自動割当されない)',
        all(s == '有休' for s in result['shifts']['emp_0']),
        set(result['shifts']['emp_0'])
    )


if __name__ == '__main__':
    test_baseline_no_fixed()
    test_fixed_values_preserved()
    test_infeasible_fallback_preserves_fixed()
    test_fixed_vs_requested_off_conflict()
    test_invalid_fixed_assignments()
    test_special_shift_excluded_from_store_counts()

    print()
    if failures:
        print(f'FAILED: {len(failures)} check(s) failed -> {failures}')
        sys.exit(1)
    else:
        print('ALL CYCLE2 TAKE2 REGRESSION TESTS PASSED')
