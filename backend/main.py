from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from graph import builder
import spacy

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading spaCy model natively into API layer...")
custom_config = {"components": {"spancat": {"threshold": 0.05}}}
nlp = spacy.load("./model-best", config=custom_config)

class EvalRequest(BaseModel):
    text: str
    thread_id: str

@app.post("/evaluate")
async def evaluate_text(req: EvalRequest):
    try:
        print("\n=== INCOMING API REQUEST ===")
        
        # Compiles the StateGraph before invocation to prevent the 500 crash
        runner = builder.compile() if hasattr(builder, "compile") else builder
        result = runner.invoke({
            "academic_text": req.text,
            "critiques": [],
            "tags": [],
            "final_scorecard": "",
            "status": ""
        })
        print("LangGraph Scorecard Complete.")
        
        doc = nlp(req.text)
        detected_tags = []
        print(f"Raw doc.spans found: {doc.spans}")
        
        for group_name, span_group in doc.spans.items():
            for span in span_group:
                raw_label = span.label_.upper() if span.label_ else group_name.upper()
                label = "DISCOURSE MARKER" if raw_label == "SC" else raw_label
                detected_tags.append(f"{label}: '{span.text}'")
                
        final_tags = list(set(detected_tags))
        print(f"Final Tags sent to React: {final_tags}")
        print("===========================\n")
        
        return {
            "scorecard": result.get("final_scorecard", ""),
            "tags": final_tags
        }
    except Exception as e:
        print(f"CRITICAL ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))