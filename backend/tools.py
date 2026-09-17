import spacy
from langchain_core.tools import tool

import os

# Get the directory where tools.py lives, then point to the model folder
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model-best") 

# Load the model
nlp = spacy.load(MODEL_PATH)

@tool
def analyze_discourse_engagement(text: str) -> list[dict]:
    """
    Extracts discourse engagement and Appraisal Framework markers from academic text.
    Always use this tool to evaluate text for concessive clauses, counter-arguments, and stance.
    """
    doc = nlp(text)
    detected_spans = []
    
    # If you trained using standard NER:
    for span_group in doc.spans.values():
        for span in span_group:
            detected_spans.append({"text": span.text, "label": span.label_})
        
    # NOTE: If you trained using SpanCategorizer (spancat) for overlapping spans, 
    # comment out the 'doc.ents' block above and use this instead:
    # for span_group in doc.spans.values():
    #     for span in span_group:
    #         detected_spans.append({"text": span.text, "label": span.label_})
            
    return detected_spans