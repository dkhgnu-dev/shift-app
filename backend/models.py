from pydantic import BaseModel
from typing import List, Optional

class ShiftType(BaseModel):
    id: str
    name: Optional[str] = None # '①', '②', '④', '⑦', '⑧', '⑨', '⑩', '⑪'
    start_time: str # "8:15"
    end_time: str # "12:15"
    is_off: bool = False

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

class ShiftInput(BaseModel):
    year: int
    month: int
    employees: List[Employee]
    shift_types: List[ShiftType]
    requests_off: List[RequestOff]
    thick_staffing_days: List[int] = []
    weekday_ranks: Optional[dict] = None  # 例: {"6": 1, "5": 2, "0": 7} (1位が最優先、7位が最低)
