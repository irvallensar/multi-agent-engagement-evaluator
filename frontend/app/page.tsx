"use client";

import { useState, useEffect, useRef } from "react";
import { Play, CheckCircle, Loader2, Upload } from "lucide-react";
import ReactMarkdown from "react-markdown";
import * as mammoth from "mammoth";

// Set up PDF.js worker
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function Home() {
  const [step, setStep] = useState<"idle" | "evaluating" | "complete">("idle");
  const [threadId, setThreadId] = useState("");
  const [text, setText] = useState("");
  const [scorecard, setScorecard] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  

  useEffect(() => {
    setThreadId(`session-${Math.random().toString(36).substring(2, 9)}`);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setError("");

  const fileExt = file.name.split(".").pop()?.toLowerCase();

  try {
    if (fileExt === "txt" || fileExt === "md") {
      const extractedText = await file.text();
      setText(extractedText);
    } else if (fileExt === "docx") {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      setText(result.value);
    } else if (fileExt === "pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => item.str)
          .join(" ");
        fullText += pageText + "\n\n";
      }
      setText(fullText.trim());
    } else {
      setError("Unsupported file type. Please upload a .txt, .docx, or .pdf file.");
    }
  } catch (err) {
    setError("Failed to extract text from document.");
  }

  if (fileInputRef.current) fileInputRef.current.value = "";
};

  const handleEvaluate = async () => {
    if (!text.trim()) return;
    setStep("evaluating");
    setError("");

    try {
      // Updated to correctly match your Vercel environment variable
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true" 
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

        {/* State 1: Input & File Upload */}
        {step === "idle" && (
          <section className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Target Text</h2>
              <div>
                <input 
                  type="file" 
                  accept=".txt,.md,.docx,.pdf" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-black transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload .txt File
                </button>
              </div>
            </div>
            
            <textarea
              className="w-full h-40 p-4 border rounded-md focus:ring-2 focus:ring-black outline-none resize-none"
              placeholder="Paste the academic paragraph here, or upload a text file..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleEvaluate}
                disabled={!text.trim()}
                className="flex items-center gap-2 bg-black text-white px-6 py-2 rounded-md hover:bg-neutral-800 disabled:opacity-50 transition-colors"
              >
                <Play className="w-4 h-4" />
                Run Evaluation
              </button>
            </div>
          </section>
        )}

        {/* State 2: Dedicated Loading UI */}
        {step === "evaluating" && (
          <section className="bg-white p-12 rounded-xl shadow-sm border flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-black" />
            <h2 className="text-xl font-semibold">Evaluating Discourse Markers...</h2>
            <p className="text-neutral-500 max-w-sm">
              The pipeline is analyzing the manuscript and synthesizing the critique. This process takes approximately 15–30 seconds.
            </p>
          </section>
        )}

        {/* State 3: Final Markdown Output */}
        {step === "complete" && (
          <section className="bg-green-50 border border-green-200 p-6 rounded-xl">
            <h2 className="text-xl font-semibold text-green-900 mb-6 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Final Aggregated Scorecard
            </h2>
            <div className="bg-white p-8 rounded-md border text-neutral-800 prose prose-neutral max-w-none">
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