from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import ShiftInput
from shift_solver import solve_shift

app = FastAPI(title="Shift Optimization API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/generate_shift")
def generate_shift(input_data: ShiftInput):
    try:
        result = solve_shift(input_data)
        if result["status"] == "FAILED":
            raise HTTPException(status_code=400, detail="Constraints could not be satisfied. Please check for conflicting rules.")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
