import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from graph import builder 

app = FastAPI()

# Prevents the preflight/CORS error from the browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EvaluationRequest(BaseModel):
    thread_id: str
    text: str

@app.post("/evaluate")
async def evaluate_endpoint(request: EvaluationRequest):
    state = builder.invoke({"academic_text": request.text, "critiques": [], "status": ""})
    
    return {
        "scorecard": state.get("final_scorecard", ""),
        "tags": state.get("critiques", []) 
    }

# Prevents the container from instantly exiting and binds it to the correct port
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=10000)