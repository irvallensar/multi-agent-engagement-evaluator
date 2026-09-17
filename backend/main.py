from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langgraph.types import Command
from graph import evaluator_graph
from fastapi import Request

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Change to your Vercel domain later for security
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
    
    # .invoke() runs the graph from start to finish without pausing
    final_state = evaluator_graph.invoke(
        {"academic_text": payload["text"]}, 
        config=config
    )
    
    return {
        "status": "complete", 
        "scorecard": final_state.get("scorecard", "Evaluation complete.")
    }

class ResumeRequest(BaseModel):
    thread_id: str
    human_feedback: str
