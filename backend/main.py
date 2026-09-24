from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from graph import builder
import spacy

app = FastAPI()

# Configures access for the Cloudflare tunnel
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading spaCy model natively into API layer...")
nlp = spacy.load("./model-best")

class EvalRequest(BaseModel):
    text: str
    thread_id: str

@app.post("/evaluate")
async def evaluate_text(req: EvalRequest):
    try:
        # 1. Run LangGraph ONLY to generate the LLM scorecard
        result = builder.invoke({
            "academic_text": req.text,
            "critiques": [],
            "tags": [],
            "final_scorecard": "",
            "status": ""
        })
        
        # 2. Run the PyTorch model directly in FastAPI, bypassing LangGraph state wipe
        doc = nlp(req.text)
        detected_tags = []
        
        for group_name, span_group in doc.spans.items():
            for span in span_group:
                # Fallback in case the span label is empty or just named 'sc'
                raw_label = span.label_.upper() if span.label_ else group_name.upper()
                label = "DISCOURSE MARKER" if raw_label == "SC" else raw_label
                detected_tags.append(f"{label}: '{span.text}'")
                
        # 3. Send BOTH to the frontend simultaneously
        return {
            "scorecard": result.get("final_scorecard", ""),
            "tags": list(set(detected_tags))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))