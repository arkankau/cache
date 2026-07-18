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


class ContextEdit(BaseModel):
    specialist_id: str
    code: str
    action: str


class ReviewEdit(BaseModel):
    specialist_id: str
    decision: str


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


@app.post("/library/context")
async def edit_specialist_context(edit: ContextEdit):
    specialist = engine.update_specialist_context(edit.specialist_id, edit.code, edit.action)
    return {"specialist": specialist, "state": engine.state()}


@app.post("/library/review")
async def review_specialist(edit: ReviewEdit):
    specialist = engine.review_agent(edit.specialist_id, edit.decision)
    return {"specialist": specialist, "state": engine.state()}
