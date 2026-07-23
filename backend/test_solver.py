import json
from shift_solver import solve_shift
from models import ShiftInput

payload = {
    "year": 2024,
    "month": 8,
    "employees": [
        {"id": "emp_0", "name": "田中 太郎", "contract_days": 23, "is_registered_seller": True, "allowed_shifts": ["④", "⑦"]},
        {"id": "emp_1", "name": "鈴木 花子", "contract_days": 23, "is_registered_seller": True, "allowed_shifts": ["④", "⑦"]},
        {"id": "emp_2", "name": "佐藤 次郎", "contract_days": 23, "is_registered_seller": True, "allowed_shifts": ["④", "⑦"]},
        {"id": "emp_3", "name": "高橋 三郎", "contract_days": 23, "is_registered_seller": True, "allowed_shifts": ["④", "⑦"]}
    ],
    "shift_types": [
        {"id": "①", "start_time": "8:15", "end_time": "12:15"},
        {"id": "②", "start_time": "8:15", "end_time": "14:15"},
        {"id": "③", "start_time": "8:15", "end_time": "16:15"},
        {"id": "④", "start_time": "8:15", "end_time": "17:30"},
        {"id": "⑤", "start_time": "11:00", "end_time": "19:00"},
        {"id": "⑥", "start_time": "14:00", "end_time": "19:00"},
        {"id": "⑦", "start_time": "15:30", "end_time": "24:00"},
        {"id": "⑧", "start_time": "17:00", "end_time": "24:00"},
        {"id": "⑨", "start_time": "17:00", "end_time": "22:00"},
        {"id": "⑩", "start_time": "19:00", "end_time": "24:00"},
        {"id": "⑪", "start_time": "21:00", "end_time": "24:00"}
    ],
    "requests_off": [],
    "thick_staffing_days": []
}

try:
    input_data = ShiftInput(**payload)
    result = solve_shift(input_data)
    print(f"Status: {result['status']}")
except Exception as e:
    print(f"Error: {e}")
