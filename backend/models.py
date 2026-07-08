from pydantic import BaseModel
from typing import List, Optional

class ShiftType(BaseModel):
    id: str
    name: str # '①', '②', '④', '⑦', '⑧', '⑨', '⑩', '⑪'
    start_time: str # "8:15"
    end_time: str # "12:15"
    is_off: bool = False

class Employee(BaseModel):
    id: str
    name: str
    employment_type: str # '正社員', '時間限定社員', '準社員', '早パート', '早ロングパート', '遅パート', '遅ロングパート'
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
    # Priority settings (optional, could be configured here)
    day_priorities: dict = {
        0: 7, # Monday: 7th
        1: 3, # Tuesday: 3rd
        2: 4, # Wednesday: 4th
        3: 6, # Thursday: 6th
        4: 5, # Friday: 5th
        5: 2, # Saturday: 2nd
        6: 1  # Sunday: 1st
    }
