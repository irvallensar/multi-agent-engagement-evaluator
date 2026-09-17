"use client";

import { useState, useEffect } from "react";
import { Play, CheckCircle, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [step, setStep] = useState<"idle" | "evaluating" | "complete">("idle");
  const [threadId, setThreadId] = useState("");
  const [text, setText] = useState("");
  const [scorecard, setScorecard] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setThreadId(`session-${Math.random().toString(36).substring(2, 9)}`);
  }, []);

  const handleEvaluate = async () => {
    if (!text.trim()) return;
    setStep("evaluating");
    setError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true" // Add this exact line
        },
        body: JSON.stringify({ thread_id: threadId, text }),
      });

      if (!res.ok) throw new Error("Server error during evaluation");
      
      const data = await res.json();
      setScorecard(data.scorecard || "");
      setStep("complete");
    } catch (err: any) {
      setError(err.message);
      setStep("idle");
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 p-8 text-neutral-900 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <header className="border-b pb-4">
          <h1 className="text-3xl font-bold tracking-tight">Composite AI Evaluator</h1>
          <p className="text-sm text-neutral-500 mt-1">Automated Discourse Analysis • Session: {threadId}</p>
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
                {step === "evaluating" ? "Analyzing..." : "Run Evaluation"}
              </button>
            </div>
          </section>
        )}

        {/* State 2: Final Output */}
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
                  setThreadId(`session-${Math.random().toString(36).substring(2, 9)}`);
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