from pydantic import BaseModel
from langgraph.types import Command
from fastapi import Request

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from graph import evaluator_graph 

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
    config = {"configurable": {"thread_id": payload.get("thread_id", "default_thread")}}
    
    # Pass academic_text to match the EvaluationState TypedDict
    final_state = evaluator_graph.invoke({"academic_text": payload["text"]}, config=config)

    # Extract final_scorecard to match the aggregator node output
    return {
        "status": "complete",
        "scorecard": final_state["final_scorecard"] 
    }

class ResumeRequest(BaseModel):
    thread_id: str
    human_feedback: str
