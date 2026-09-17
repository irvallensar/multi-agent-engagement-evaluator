"use client";

import { Play, CheckCircle, Loader2, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useState, useEffect } from "react";

export default function Home() {
  const [step, setStep] = useState<"idle" | "evaluating" | "paused" | "resuming" | "complete">("idle");
  const [threadId, setThreadId] = useState("");

  useEffect(() => {
    setThreadId(`session-${Math.random().toString(36).substring(2, 9)}`);
  }, []);
  
  const [text, setText] = useState("");
  const [critiques, setCritiques] = useState<string[]>([]);
  const [humanFeedback, setHumanFeedback] = useState("");
  const [scorecard, setScorecard] = useState("");
  const [error, setError] = useState("");

  const handleEvaluate = async () => {
    if (!text.trim()) return;
    setStep("evaluating");
    setError("");

    try {
      const res = await fetch("process.env.http://127.0.0.1:8001/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: threadId, text }),
      });

      if (!res.ok) throw new Error("Server error during evaluation");
      
      const data = await res.json();
      if (data.status === "paused") {
        setCritiques(data.data?.pending_critiques || []);
        setStep("paused");
      }
    } catch (err: any) {
      setError(err.message);
      setStep("idle");
    }
  };

  const handleResume = async () => {
    if (!humanFeedback.trim()) return;
    setStep("resuming");
    setError("");

    try {
      const res = await fetch("http://127.0.0.1:8001/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: threadId, human_feedback: humanFeedback }),
      });

      if (!res.ok) throw new Error("Server error during synthesis");
      
      const data = await res.json();
      if (data.status === "complete") {
        setScorecard(data.scorecard || "");
        setStep("complete");
      }
    } catch (err: any) {
      setError(err.message);
      setStep("paused");
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 p-8 text-neutral-900 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="border-b pb-4">
          <h1 className="text-3xl font-bold tracking-tight">Composite AI Evaluator</h1>
          <p className="text-sm text-neutral-500 mt-1">Multi-Agent Discourse Analysis • Session: {threadId}</p>
        </header>

        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded-md border border-red-200">
            {error}
          </div>
        )}

        {/* State 1: Submission */}
        {(step === "idle" || step === "evaluating") && (
          <section className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Target Text</h2>
            <textarea
              className="w-full h-40 p-4 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="Paste the academic paragraph here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={step === "evaluating"}
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleEvaluate}
                disabled={step === "evaluating" || !text.trim()}
                className="flex items-center gap-2 bg-black text-white px-6 py-2 rounded-md hover:bg-neutral-800 disabled:opacity-50 transition-colors"
              >
                {step === "evaluating" ? <Loader2 className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4" />}
                {step === "evaluating" ? "Agents Analyzing..." : "Run Evaluation"}
              </button>
            </div>
          </section>
        )}

        {/* State 2: Interception (Human-in-the-loop) */}
        {(step === "paused" || step === "resuming") && (
          <section className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
              <h2 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                Graph Paused: Awaiting Human Feedback
              </h2>
              <div className="space-y-4">
                {critiques.map((critique, i) => (
                  <div key={i} className="bg-white p-4 rounded-md border text-sm overflow-auto max-h-60">
                    <ReactMarkdown>{critique}</ReactMarkdown>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-lg font-semibold mb-4">Teaching Assistant Checkpoint</h2>
              <textarea
                className="w-full h-24 p-4 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Approve or correct the AI critiques before generating the final scorecard..."
                value={humanFeedback}
                onChange={(e) => setHumanFeedback(e.target.value)}
                disabled={step === "resuming"}
              />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleResume}
                  disabled={step === "resuming" || !humanFeedback.trim()}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {step === "resuming" ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                  {step === "resuming" ? "Synthesizing..." : "Inject Feedback & Resume"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* State 3: Synthesis */}
        {step === "complete" && (
          <section className="bg-green-50 border border-green-200 p-6 rounded-xl">
            <h2 className="text-xl font-semibold text-green-900 mb-6 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Final Aggregated Scorecard
            </h2>
            <div className="bg-white p-6 rounded-md border text-neutral-800">
              <ReactMarkdown>{scorecard}</ReactMarkdown>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setStep("idle");
                  setText("");
                  setHumanFeedback("");
                }}
                className="bg-white border text-black px-6 py-2 rounded-md hover:bg-neutral-50 transition-colors"
              >
                Evaluate New Submission
              </button>
            </div>
          </section>
        )}

      </div>
    </main>
  );
}