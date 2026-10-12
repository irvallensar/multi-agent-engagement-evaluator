"use client";

import { useState, useEffect, useRef } from "react";
import { Play, CheckCircle, Loader2, Upload, Target, Download, Sun, Moon } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [step, setStep] = useState<"idle" | "evaluating" | "complete">("idle");
  const [threadId, setThreadId] = useState("");
  const [text, setText] = useState("");
  const [scorecard, setScorecard] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check system theme preference on mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setIsDarkMode(true);
    }
    setThreadId(`session-${Math.random().toString(36).substring(2, 9)}`);
  }, []);

  const [loadingMessage, setLoadingMessage] = useState("Initializing evaluation pipeline...");

  useEffect(() => {
    if (step !== "evaluating") {
      setLoadingMessage("Initializing evaluation pipeline...");
      return;
    }

    const loadingSteps = [
      "Initializing multi-agent pipeline...",
      "Waking up Google Cloud edge server...",
      "Loading DA-RoBERTa spancat model...",
      "Reviewer Agents are analyzing text...",
      "Extracting Appraisal Framework spans...",
      "Aggregator Agent synthesizing scorecard...",
      "Merging data payload. Almost done..."
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep = (currentStep + 1) % loadingSteps.length;
      setLoadingMessage(loadingSteps[currentStep]);
    }, 15000); 

    return () => clearInterval(interval);
  }, [step]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    // Restrict uploads to 2MB (2 * 1024 * 1024 bytes)
    const MAX_FILE_SIZE = 2 * 1024 * 1024; 
    if (file.size > MAX_FILE_SIZE) {
      setError("File is too large. Please upload a document smaller than 2MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase();

    try {
      if (fileExt === "txt" || fileExt === "md") {
        const extractedText = await file.text();
        setText(extractedText);
      } else if (fileExt === "docx") {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setText(result.value);
      } else if (fileExt === "pdf") {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(" ");
          fullText += pageText + "\n\n";
        }
        setText(fullText.trim());
      } else {
        setError("Unsupported file type. Please upload a .txt, .docx, or .pdf file.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to extract text from document.");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleEvaluate = async () => {
    if (!text.trim()) return;
    setStep("evaluating");
    setError("");
    setTags([]); 

    try {
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
      setTags(data.tags || []);
      setStep("complete");
    } catch (err: any) {
      setError(err.message);
      setStep("idle");
    }
  };

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-8 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-200">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Header & Toggle Pill */}
          <header className="border-b border-neutral-200 dark:border-neutral-800 pb-4 print:hidden flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Multi-Agent Engagement Evaluator</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Automated Discourse Analysis • Session: {threadId}</p>
            </div>
            
            <div className="flex items-center gap-2 self-start sm:self-auto bg-white dark:bg-neutral-900 px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <Sun className={`w-4 h-4 ${!isDarkMode ? 'text-amber-500' : 'text-neutral-400'}`} />
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="relative inline-flex h-5 w-10 items-center rounded-full bg-neutral-300 dark:bg-neutral-700 transition-colors focus:outline-none"
              >
                <span className="sr-only">Toggle dark mode</span>
                <span
                  className={`${
                    isDarkMode ? "translate-x-6" : "translate-x-1"
                  } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                />
              </button>
              <Moon className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-neutral-400'}`} />
            </div>
          </header>

          {error && (
            <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800/50 print:hidden">
              {error}
            </div>
          )}

          {step === "idle" && (
            <section className="bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 print:hidden transition-colors">
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
                    className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Document (max. 2MB)
                  </button>
                </div>
              </div>
              
              <textarea
                className="w-full h-40 p-4 border border-neutral-200 dark:border-neutral-700 bg-transparent rounded-md focus:ring-2 focus:ring-black dark:focus:ring-white outline-none resize-none transition-colors duration-100"
                placeholder="Paste the academic paragraph here, or upload a document..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleEvaluate}
                  disabled={!text.trim()}
                  className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-md hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-50 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Run Evaluation
                </button>
              </div>
            </section>
          )}

          {step === "evaluating" && (
            <section className="bg-white dark:bg-neutral-900 p-12 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center text-center space-y-4 print:hidden transition-colors">
              <Loader2 className="w-10 h-10 animate-spin text-black dark:text-white" />
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 animate-pulse transition-all duration-300">
                {loadingMessage}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                (Cold-booting ML models may take 1-2 minutes)
              </p>
            </section>
          )}

          {step === "complete" && (
            <section className="bg-green-50 dark:bg-neutral-900 border border-green-200 dark:border-neutral-800 p-6 rounded-xl print:border-none print:bg-white print:p-0 transition-colors">
              <h2 className="text-xl font-semibold text-green-900 dark:text-green-400 mb-6 flex items-center gap-2 print:text-black">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-500 print:hidden" />
                Final Aggregated Scorecard
              </h2>
              
              <div id="scorecard-container" className="bg-white dark:bg-neutral-950 p-8 rounded-md border border-neutral-200 dark:border-neutral-800 print:border-none print:p-0 transition-colors">
                <div className="text-neutral-800 dark:text-neutral-200 prose prose-neutral dark:prose-invert max-w-none">
                  <ReactMarkdown>{scorecard}</ReactMarkdown>
                </div>

                <div className="mt-8 border-t border-gray-200 dark:border-neutral-800 pt-6">
                  <h3 className="text-lg font-semibold text-green-900 dark:text-green-400 mb-4 flex items-center gap-2 print:text-black">
                    <Target className="w-5 h-5 text-green-600 dark:text-green-500 print:hidden" />
                    Discourse Span Analysis
                  </h3>
                  <div className="space-y-2 text-sm font-mono">
                    {tags && tags.length > 0 ? (
                      tags.map((tag, index) => (
                        <div 
                          key={index} 
                          className="p-3 rounded-md border bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-300 print:border-gray-300 print:bg-transparent print:text-black transition-colors"
                        >
                          {tag}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 rounded-md border bg-gray-50 border-gray-200 text-gray-800 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 print:border-gray-300 print:bg-transparent print:text-black transition-colors">
                        No markers exceeded the confidence threshold.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-4 print:hidden">
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white px-6 py-2 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <button
                  onClick={() => {
                    setStep("idle");
                    setText("");
                    setThreadId(`session-${Math.random().toString(36).substring(2, 9)}`);
                  }}
                  className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-md hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
                >
                  Evaluate New Submission
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}