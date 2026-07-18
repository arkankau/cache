from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .loop import DemoEngine


app = FastAPI(title="Cache Demo API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

engine = DemoEngine()


class LakeEdit(BaseModel):
    code: str = "ST-CA-07"
    rate: float = 0.08


@app.get("/health")
async def health():
    return {"ok": True}


@app.get("/state")
async def state():
    return engine.state()


@app.post("/run")
async def run_demo():
    started = await engine.start()
    return {"started": started, "state": engine.state()}


@app.post("/reset")
async def reset_demo():
    await engine.reset()
    return engine.state()


@app.post("/lake/edit")
async def edit_lake(edit: LakeEdit):
    row = engine.edit_lake_rate(edit.code, edit.rate)
    return {"code": edit.code, "row": row, "state": engine.state()}
