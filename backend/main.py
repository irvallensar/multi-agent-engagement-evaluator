from pydantic import BaseModel
from langgraph.types import Command
from graph import evaluator_graph
from fastapi import Request

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from graph import app_graph

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EvaluateRequest(BaseModel):
    thread_id: str
    text: str


@app.post("/evaluate")
async def evaluate(request: Request):
    payload = await request.json()
    config = {"configurable": {"thread_id": payload["thread_id"]}}
    
    # Extract text from the payload and pass the config argument
    final_state = app_graph.invoke({"input": payload["text"]}, config=config)

    return {
        "status": "complete",
        "scorecard": final_state["scorecard"]
    }

class ResumeRequest(BaseModel):
    thread_id: str
    human_feedback: str
