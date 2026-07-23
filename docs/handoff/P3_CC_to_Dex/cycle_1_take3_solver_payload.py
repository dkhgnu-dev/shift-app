"""
Take3検証用: frontend/src/App.jsx の INITIAL_DATA (2026-07時点) と
SHIFT_MASTER をそのまま反映した24名構成のsolve_shift()検証payload。

個人情報は含まない（現在のイニシャル表記・雇用区分・登録販売者資格・契約日数・
可能シフトのみ）。frontend/src/App.jsx の INITIAL_DATA / SHIFT_MASTER と
完全一致していることを確認済み（下記コメント参照）。

使い方:
    cd backend
    python ../docs/handoff/P3_CC_to_Dex/cycle_1_take3_solver_payload.py
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'backend'))

from models import ShiftInput
from shift_solver import solve_shift

# frontend/src/App.jsx の SHIFT_MASTER と完全一致
SHIFT_MASTER = {
    '①': '8:15~12:15', '②': '8:15~14:15', '③': '8:15~16:15',
    '④': '8:15~17:30', '⑤': '11:00~19:00', '⑥': '14:00~19:00', '⑦': '15:30~24:00', '⑧': '17:00~24:00',
    '⑨': '17:00~22:00', '⑩': '19:00~24:00', '⑪': '21:00~24:00',
}
SHIFT_TYPES = [
    {'id': k, 'start_time': v.split('~')[0], 'end_time': v.split('~')[1]}
    for k, v in SHIFT_MASTER.items()
]

# frontend/src/App.jsx の INITIAL_DATA と完全一致 (name, type, isRS, days, shifts)
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
    {
        'id': f'emp_{i}',
        'name': n,
        'employment_type': t,
        'is_registered_seller': rs,
        'contract_days': d,
        'allowed_shifts': s,
    }
    for i, (n, t, rs, d, s) in enumerate(INITIAL_DATA)
]

# frontend/src/App.jsx の weekdayRanks デフォルト値と完全一致
WEEKDAY_RANKS = {'6': 1, '5': 2, '1': 3, '2': 4, '4': 5, '3': 6, '0': 7}
# frontend/src/App.jsx の weekdayMinStaff デフォルト値と完全一致（全曜日0=制限なし）
WEEKDAY_MIN_STAFF = {'6': 0, '5': 0, '0': 0, '1': 0, '2': 0, '3': 0, '4': 0}


def build_payload(year: int, month: int):
    return {
        'year': year,
        'month': month,
        'employees': EMPLOYEES,
        'shift_types': SHIFT_TYPES,
        'requests_off': [],
        'thick_staffing_days': [],
        'weekday_ranks': WEEKDAY_RANKS,
        'weekday_min_staff': WEEKDAY_MIN_STAFF,
    }


def run_once(year: int, month: int):
    payload = build_payload(year, month)
    input_data = ShiftInput(**payload)
    result = solve_shift(input_data)
    warnings = result['warnings']
    rs_warnings = [w for w in warnings if '登録販売者' in w]
    contract_warnings = [w for w in warnings if '契約日数' in w]
    return {
        'year': year,
        'month': month,
        'status': result['status'],
        'phase1_status': result.get('phase1_status'),
        'phase2_status': result.get('phase2_status'),
        'warnings_total': len(warnings),
        'rs_warnings': len(rs_warnings),
        'contract_warnings': len(contract_warnings),
        'sample_rs_warning': rs_warnings[0] if rs_warnings else None,
    }


if __name__ == '__main__':
    import json
    # 現在アプリのデフォルト月選択ロジック (new Date().getMonth()+1) に対応する
    # 2026年7月・8月の両方で確認する（どちらか一方が実アプリの想定月と一致する）
    for month in (7, 8):
        for run_idx in range(2):
            r = run_once(2026, month)
            print(f"month={month} run={run_idx}: {json.dumps(r, ensure_ascii=False)}")
