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
    
    final_state = evaluator_graph.invoke({"academic_text": payload["text"]}, config=config)

    # If the graph paused at the human review node, return the pending critiques
    if "final_scorecard" not in final_state:
        critiques = final_state.get("critiques", ["No critiques generated."])
        return {
            "status": "pending_human_review",
            "scorecard": "## Graph paused for human review.\n\n**Pending Critiques:**\n" + "\n\n".join(critiques)
        }

    # If the graph completed, return the final scorecard
    return {
        "status": "complete",
        "scorecard": final_state["final_scorecard"] 
    }
