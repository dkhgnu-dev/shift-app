from pydantic import BaseModel
from typing import List, Optional

class ShiftType(BaseModel):
    id: str
    name: Optional[str] = None # '①', '②', '④', '⑦', '⑧', '⑨', '⑩', '⑪'
    start_time: str # "8:15"
    end_time: str # "12:15"
    is_off: bool = False
    is_special: bool = False  # 有休/応援/店長会/研修/勉強会等: 個人時間には計上するが店舗人数・登販・鍵持ち集計からは除外

class Employee(BaseModel):
    id: str
    name: str
    employment_type: Optional[str] = None # '正社員', '時間限定社員', '準社員', '早パート', '早ロングパート', '遅パート', '遅ロングパート'
    is_registered_seller: bool
    contract_days: int
    allowed_shifts: List[str] # List of ShiftType IDs

class RequestOff(BaseModel):
    employee_id: str
    date: str # YYYY-MM-DD
    is_forced: bool = True # If false, it's a manager override (violation allowed)

class FixedAssignment(BaseModel):
    employee_id: str
    day_index: int  # 期間開始日を0とした通算インデックス
    shift_id: str   # ShiftType.id または 'OFF'

class ShiftInput(BaseModel):
    year: int
    month: int
    employees: List[Employee]
    shift_types: List[ShiftType]
    requests_off: List[RequestOff]
    thick_staffing_days: List[int] = []
    weekday_ranks: Optional[dict] = None  # 例: {"6": 1, "5": 2, "0": 7} (1位が最優先、7位が最低)
    weekday_min_staff: Optional[dict] = None   # 例: {"6": 5, "5": 4, "0": 3} (曜日別の最低出勤人数。0または未設定=制限なし)
    fixed_assignments: List[FixedAssignment] = []  # 「空欄自動作成」用: 既に手動入力済みのセルを固定条件として渡す
    allow_warning_draft: bool = False  # true時のみ、INFEASIBLE時に違反一覧付きの警告仮シフトを返す（false時は表を返さない）
