from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langgraph.types import Command
from graph import evaluator_graph

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
async def evaluate(req: EvaluateRequest):
    config = {"configurable": {"thread_id": req.thread_id}}
    state = {"academic_text": req.text, "critiques": [], "final_scorecard": ""}
    
    for event in evaluator_graph.stream(state, config=config):
        if "__interrupt__" in event:
            return {"status": "paused", "data": event["__interrupt__"][0].value}
            
    return {"status": "error"}

class ResumeRequest(BaseModel):
    thread_id: str
    human_feedback: str

@app.post("/resume")
async def resume(req: ResumeRequest):
    config = {"configurable": {"thread_id": req.thread_id}}
    command = Command(resume=req.human_feedback)
    
    final_state = None
    for event in evaluator_graph.stream(command, config=config):
        final_state = event
        
    if "aggregator" in final_state:
        return {"status": "complete", "scorecard": final_state["aggregator"]["final_scorecard"]}