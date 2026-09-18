import operator
from typing import Annotated, TypedDict, Dict, Any
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt
from langgraph.checkpoint.sqlite import SqliteSaver
import sqlite3

# --- IMPORTS FROM YOUR MODULAR FILES ---
from tools import analyze_discourse_engagement
from prompts import engagement_prompt, rhetorical_prompt, aggregator_prompt
from prompts import engagement_prompt
from prompts import rhetorical_prompt

# Initialize the Groq inference engine (Llama 3)
llm = ChatGroq(model="openai/gpt-oss-120b", temperature=0)

# Chain the prompt and the LLM together
engagement_chain = engagement_prompt | llm
aggregator_chain = aggregator_prompt | llm
rhetorical_chain = rhetorical_prompt | llm

# --- STATE DEFINITION ---
class EvaluationState(TypedDict):
    academic_text: str
    critiques: Annotated[list[str], operator.add]
    final_scorecard: str

# --- NODE LOGIC ---
def engagement_critic(state: EvaluationState) -> Dict[str, Any]:
    """
    Evaluates discourse engagement markers by running the custom Waseda sequence tagger
    and synthesizing the output via LLM.
    """
    text = state["academic_text"]
    
    # 1. Execute the discriminative Waseda model locally via tools.py
    detected_tags = analyze_discourse_engagement.invoke(text)
    
    # 2. Format the tags into a readable string for the LLM prompt
    formatted_tags = "\n".join([f"- Span: '{tag['text']}' | Classification: {tag['label']}" for tag in detected_tags])
    
    # 3. Generate the narrative critique using the chain
    response = engagement_chain.invoke({
        "academic_text": text,
        "da_roberta_tags": formatted_tags
    })
    
    # 4. Return the result to be appended to the state
    return {"critiques": [f"### Discourse Engagement Analysis\n{response.content}"]}

def rhetorical_critic(state: EvaluationState):
    """Evaluates the rhetorical flow in parallel to the engagement critic."""
    response = rhetorical_chain.invoke({"academic_text": state["academic_text"]})
    return {"critiques": [f"### Rhetorical Structure Analysis\n{response.content}"]}

def human_review_node(state: EvaluationState):
    """Pauses the graph to wait for human approval/edits."""
    human_feedback = interrupt({"pending_critiques": state["critiques"]})
    return {"critiques": [human_feedback]}

def aggregator(state: EvaluationState):
    """
    Synthesizes the finalized human-reviewed critiques into a complete scorecard.
    """
    text = state["academic_text"]
    critiques_list = state["critiques"]
    
    # Because of parallel execution and operator.add:
    # Everything before the last item is the automated AI output.
    # The very last item is the feedback injected by the human_review_node.
    if len(critiques_list) > 1:
        automated_critiques = "\n---\n".join(critiques_list[:-1])
        human_instructions = critiques_list[-1]
    else:
        # Fallback in case human review was bypassed or graph ran differently
        automated_critiques = "No automated critiques generated."
        human_instructions = critiques_list[0] if critiques_list else "No feedback provided."
    
    # Generate the final scorecard
    response = aggregator_chain.invoke({
        "academic_text": text,
        "automated_critiques": automated_critiques,
        "human_instructions": human_instructions
    })
    
    return {"final_scorecard": response.content}

# --- GRAPH ASSEMBLY ---
builder = StateGraph(EvaluationState)

builder.add_node("rhetorical_critic", rhetorical_critic)
builder.add_node("engagement_critic", engagement_critic)
builder.add_node("aggregator", aggregator)

builder.add_edge(START, "rhetorical_critic")
builder.add_edge(START, "engagement_critic")

# Route critics directly to the aggregator, bypassing human review
builder.add_edge("rhetorical_critic", "aggregator")
builder.add_edge("engagement_critic", "aggregator")

builder.add_edge("aggregator", END)

# Compile with SQLite persistence
conn = sqlite3.connect("database.sqlite", check_same_thread=False)
checkpointer = SqliteSaver(conn)
evaluator_graph = builder.compile(checkpointer=checkpointer)