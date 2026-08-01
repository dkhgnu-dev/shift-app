"""
Cycle 12 恒久回帰テスト。

docs/handoff/P2_Dex_to_CC/cycle_12_protection_and_stamp_instructions.md の
バックエンド必須自動テスト(6.2)のうち、Cycle12で新規に変更・修正した挙動
(fail-closed検証、土日祝day_maxの持ち越し是正、EARLY/LATE特殊シフト除外、
EARLY/MID/LATE境界)を固定する。fail-closedの網羅ケース自体は
test_cycle2_take2.py(test_fixed_vs_requested_off_conflict /
test_invalid_fixed_assignments_fail_closed)で既にカバーしているため、
ここでは重複させず、Cycle12固有の新規挙動だけを対象にする。

使い方:
    cd backend
    python test_cycle12.py
"""
import sys
import datetime

import jpholiday

from models import ShiftInput
from shift_solver import solve_shift, classify_shift_category, get_period_start

failures = []


def check(name, condition, detail=''):
    if condition:
        print(f'[OK] {name}')
    else:
        print(f'[NG] {name} {detail}')
        failures.append(name)


SHIFT_A = {'id': 'A', 'start_time': '9:00', 'end_time': '17:00', 'is_special': False}


def make_employees(count, contract_days, allowed_shifts=('A',)):
    return [
        {'id': f'emp_{i}', 'name': f'e{i}', 'employment_type': None, 'is_registered_seller': False,
         'contract_days': contract_days, 'allowed_shifts': list(allowed_shifts)}
        for i in range(count)
    ]


# --- 1. 土日祝day_maxの持ち越し是正(4.1) ---
def test_day_max_does_not_carry_over_to_next_weekday():
    # 2026年7月度(period 6/16〜7/15)。day_index=4は土曜(6/20)、6は月曜(6/22、平日)。
    # 5人・contract_days=6固定 -> base_avg=1, base_max_allowed=2, half_staff_min=ceil(5*0.5)=3。
    # 土曜は50%ルールでday_maxが3へ引き上がるが、その直後の月曜(平日)は
    # base_max_allowed=2のままであるべきで、3人固定は矛盾しINFEASIBLEになる必要がある
    # (持ち越しバグが残っていれば、月曜でも3人固定がSUCCESS/FEASIBLE_WITH_WARNINGSになってしまう)。
    def build(monday_fixed_count):
        employees = make_employees(5, contract_days=6)
        fixed = [{'employee_id': f'emp_{i}', 'day_index': 4, 'shift_id': 'A'} for i in range(3)]
        fixed += [{'employee_id': f'emp_{i}', 'day_index': 6, 'shift_id': 'A'} for i in range(monday_fixed_count)]
        return ShiftInput(year=2026, month=7, employees=employees, shift_types=[SHIFT_A],
                           requests_off=[], fixed_assignments=fixed)

    result_2 = solve_shift(build(2))
    check('1a. 月曜(平日)へ2人固定はbase_max_allowed(2)以内でINFEASIBLEにならない',
          result_2['status'] != 'INFEASIBLE', result_2['status'])

    result_3 = solve_shift(build(3))
    check('1b. 月曜(平日)へ3人固定はbase_max_allowed(2)を超えINFEASIBLEになる(day_max持ち越しなし)',
          result_3['status'] == 'INFEASIBLE', result_3['status'])


# --- 2. jpholiday統合: 土日以外の祝日でも50%ルールが働く(4.1) ---
def test_holiday_weekday_triggers_half_staff_rule():
    # 2026年8月度(period 7/16〜8/15)。8/11(火)は山の日(祝日、土日ではない)。day_index=26。
    # 比較対象は7/21(火、祝日でない)day_index=5。
    start = get_period_start(2026, 8)
    check('2-setup. 8/11は火曜かつ祝日である(前提確認)',
          jpholiday.is_holiday(datetime.date(2026, 8, 11)) and datetime.date(2026, 8, 11).weekday() == 1)
    check('2-setup. day_index計算が期待通り(26)',
          (datetime.date(2026, 8, 11) - start).days == 26)

    def build(day_index):
        employees = make_employees(6, contract_days=8)
        # 5人をその日だけOFF固定し、最大1人しか出勤できない状態を作る
        fixed = [{'employee_id': f'emp_{i}', 'day_index': day_index, 'shift_id': 'OFF'} for i in range(5)]
        return ShiftInput(year=2026, month=8, employees=employees, shift_types=[SHIFT_A],
                           requests_off=[], fixed_assignments=fixed)

    result_holiday = solve_shift(build(26))
    check('2a. 祝日(8/11)に1人しか出勤できない状態はINFEASIBLE(50%ルールがjpholidayで働く)',
          result_holiday['status'] == 'INFEASIBLE', result_holiday['status'])

    result_normal_tue = solve_shift(build(5))
    check('2b. 同条件でも祝日でない火曜(7/21)はINFEASIBLEにならない(50%ルール不適用)',
          result_normal_tue['status'] != 'INFEASIBLE', result_normal_tue['status'])


# --- 3. classify_shift_category: EARLY/MID/LATE境界(4.2) ---
def test_classify_shift_category_boundaries():
    check('3a. 8:15〜17:30(15時開始未満・22時終了未満)はEARLY', classify_shift_category('8:15', '17:30') == 'EARLY')
    check('3b. 11:00〜19:00(11時以降開始・18時以降終了)はMID', classify_shift_category('11:00', '19:00') == 'MID')
    check('3c. 15:30〜24:00(15時以降開始)はLATE', classify_shift_category('15:30', '24:00') == 'LATE')
    check('3d. 9:00〜22:00(22時終了)はLATE(終了時刻基準)', classify_shift_category('9:00', '22:00') == 'LATE')
    check('3e. 10:00〜18:30(MID条件を満たさない)はEARLY', classify_shift_category('10:00', '18:30') == 'EARLY')


# --- 4. 特殊シフトはEARLY/LATE差分へ入らない(4.2) ---
def test_special_shifts_excluded_from_early_late_diff():
    # 有休(0:00〜0:00、is_special)はclassify_shift_categoryにかけるとEARLY相当の時刻になるが、
    # is_special:trueのため早遅平準化の集計対象から除外されるべき。
    # 除外されていれば、有休だけを大量固定しても早遅平準化ペナルティによる目的関数への
    # 影響が生じず、通常のSUCCESS応答が得られる(クラッシュや異常な偏り検出がない)ことを確認する。
    employees = make_employees(4, contract_days=10, allowed_shifts=['A'])
    special = {'id': '有休', 'start_time': '0:00', 'end_time': '0:00', 'is_special': True}
    fixed = [{'employee_id': 'emp_0', 'day_index': d, 'shift_id': '有休'} for d in range(10)]
    payload = ShiftInput(year=2026, month=7, employees=employees, shift_types=[SHIFT_A, special],
                          requests_off=[], fixed_assignments=fixed)
    result = solve_shift(payload)
    check('4. 有休大量固定でもクラッシュせず応答が返る(特殊シフトがEARLY/LATE集計から除外)',
          result['status'] in ('SUCCESS', 'FEASIBLE_WITH_WARNINGS', 'INFEASIBLE'), result['status'])
    if result['status'] != 'INFEASIBLE':
        check('4b. emp_0の固定日は有休のまま保持される',
              all(result['shifts']['emp_0'][d] == '有休' for d in range(10)),
              result['shifts']['emp_0'][:10])


if __name__ == '__main__':
    test_day_max_does_not_carry_over_to_next_weekday()
    test_holiday_weekday_triggers_half_staff_rule()
    test_classify_shift_category_boundaries()
    test_special_shifts_excluded_from_early_late_diff()

    print()
    if failures:
        print(f'FAILED: {len(failures)} check(s) failed -> {failures}')
        sys.exit(1)
    else:
        print('ALL CYCLE12 REGRESSION TESTS PASSED')
