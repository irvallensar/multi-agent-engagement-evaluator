from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from graph import builder

app = FastAPI()

# Configures access for the Cloudflare tunnel
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EvalRequest(BaseModel):
    text: str
    thread_id: str

@app.post("/evaluate")
async def evaluate_text(req: EvalRequest):
    try:
        result = builder.invoke({
            "academic_text": req.text,
            "critiques": [],
            "tags": [],
            "final_scorecard": "",
            "status": ""
        })
        
        # Explicitly maps the tags array into the JSON response for Next.js
        return {
            "scorecard": result.get("final_scorecard", ""),
            "tags": result.get("tags", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))