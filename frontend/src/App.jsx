import { useEffect, useMemo, useState } from "react";
import { Alert } from "./components/Alert.jsx";
import { Badge } from "./components/Badge.jsx";
import { Button } from "./components/Button.jsx";
import { Card, CardHeader } from "./components/Card.jsx";
import { CodePanel } from "./components/CodePanel.jsx";
import { Field, NumberInput, TextInput } from "./components/Field.jsx";
import { SectionHeader } from "./components/SectionHeader.jsx";

/**
 * Very small "markdown-ish" formatter for your current summary style.
 * It supports:
 * - **Title:** lines as section headers
 * - bullet lines starting with "*" or "-" into <ul>
 */
function cleanSummaryText(text) {
  if (!text) return "";

  return text
    // remove double quotes
    .replace(/"/g, "")

    // remove markdown bold markers **text**
    .replace(/\*\*(.*?)\*\*/g, "$1")

    // remove leading intro sentence if exists
    .replace(/^Here'?s a summary.*?:/i, "")

    // clean multiple blank lines
    .replace(/\n{3,}/g, "\n\n")

    .trim();
}

function renderSummary(summaryText) {
  if (!summaryText) return null;

  const cleaned = cleanSummaryText(summaryText);
  const lines = cleaned.split("\n").map((l) => l.trim());

  const blocks = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc space-y-1 pl-5">
          {currentList.map((item, idx) => (
            <li key={idx} className="text-sm leading-6 text-slate-700">
              {item}
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Section headers (Key Points, Important Dates, Action Items)
    const headerMatch = line.match(/^(Key Points|Important Dates\/Numbers|Action Items)\s*:?\s*$/i);
    if (headerMatch) {
      flushList();
      blocks.push(
        <h3 key={`h-${blocks.length}`} className="mt-4 text-sm font-semibold text-slate-900">
          {headerMatch[1]}
        </h3>
      );
      continue;
    }

    // Bullet lines
    const bulletMatch = line.match(/^[-•*]\s+(.*)$/);
    if (bulletMatch) {
      currentList.push(bulletMatch[1]);
      continue;
    }

    // Normal text paragraph
    flushList();
      blocks.push(
        <p key={`p-${blocks.length}`} className="text-sm leading-6 text-slate-700">
          {line}
        </p>
      );
  }

  flushList();

  return <div className="space-y-2">{blocks}</div>;
}

export default function App() {
  const API = import.meta.env.VITE_API_BASE_URL;

  // Health check
  const [status, setStatus] = useState({ loading: true, data: null, error: null });

  // Upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [upload, setUpload] = useState({ loading: false, data: null, error: null });

  // Extract
  const [maxPages, setMaxPages] = useState(4);
  const [extract, setExtract] = useState({ loading: false, data: null, error: null });

  // Summarize
  const [summarize, setSummarize] = useState({ loading: false, data: null, error: null });

  // RAG Index
  const [indexing, setIndexing] = useState({ loading: false, data: null, error: null });

  // RAG Ask
  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState(4);
  const [ask, setAsk] = useState({ loading: false, data: null, error: null });


  const [fileInputKey, setFileInputKey] = useState(0);

  const documentId = upload?.data?.document_id || null;
  const canExtract = Boolean(documentId) && !upload.loading;
  const canSummarize = Boolean(extract?.data?.text_length > 0) && !extract.loading;

  const canIndex = Boolean(extract?.data?.text_length > 0) && !extract.loading;
  const canAsk = Boolean(indexing?.data?.chunks_indexed > 0) && !indexing.loading;

  const pretty = useMemo(() => (obj) => JSON.stringify(obj, null, 2), []);



  // health check on load
  useEffect(() => {
    if (!API) {
      setStatus({ loading: false, data: null, error: "VITE_API_BASE_URL is not set" });
      return;
    }

    fetch(`${API}/health`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setStatus({ loading: false, data: json, error: null });
      })
      .catch((err) => {
        setStatus({ loading: false, data: null, error: err.message || "Failed to fetch" });
      });
  }, [API]);

  async function handleUpload(e) {
    e.preventDefault();

    // Reset downstream steps when uploading a new file
    setExtract({ loading: false, data: null, error: null });
    setSummarize({ loading: false, data: null, error: null });

    if (!selectedFile) {
      setUpload({ loading: false, data: null, error: "Please select a PDF file first." });
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setUpload({ loading: false, data: null, error: "Only PDF files are allowed." });
      return;
    }

    setUpload({ loading: true, data: null, error: null });

    try {
      const form = new FormData();
      form.append("file", selectedFile);

      const res = await fetch(`${API}/api/upload`, { method: "POST", body: form });
      const json = await res.json();

      if (!res.ok) throw new Error(json?.detail || `Upload failed (HTTP ${res.status})`);
      setUpload({ loading: false, data: json, error: null });
      setFileInputKey((k) => k + 1);
      setSelectedFile(null);
      setIndexing({ loading: false, data: null, error: null });
      setAsk({ loading: false, data: null, error: null });
      setQuestion("");

    } catch (err) {
      setUpload({ loading: false, data: null, error: err.message || "Upload failed" });
    }
  }

  async function handleExtract() {
    if (!documentId) {
      setExtract({ loading: false, data: null, error: "No document_id found. Upload first." });
      return;
    }

    const pages = Number(maxPages);
    if (!Number.isFinite(pages) || pages < 1 || pages > 4) {
      setExtract({ loading: false, data: null, error: "max_pages must be between 1 and 4." });
      return;
    }

    setExtract({ loading: true, data: null, error: null });
    setSummarize({ loading: false, data: null, error: null });

    try {
      const res = await fetch(`${API}/api/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: documentId, max_pages: pages }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || `Extract failed (HTTP ${res.status})`);
      setExtract({ loading: false, data: json, error: null });
    } catch (err) {
      setExtract({ loading: false, data: null, error: err.message || "Extract failed" });
    }
  }

  async function handleSummarize() {
    if (!documentId) {
      setSummarize({ loading: false, data: null, error: "No document_id found. Upload first." });
      return;
    }

    setSummarize({ loading: true, data: null, error: null });

    try {
      const res = await fetch(`${API}/api/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: documentId }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || `Summarize failed (HTTP ${res.status})`);
      setSummarize({ loading: false, data: json, error: null });
    } catch (err) {
      setSummarize({ loading: false, data: null, error: err.message || "Summarize failed" });
    }
  }

    async function handleIndex() {
    if (!documentId) {
      setIndexing({ loading: false, data: null, error: "No document_id found. Upload first." });
      return;
    }

    setIndexing({ loading: true, data: null, error: null });
    setAsk({ loading: false, data: null, error: null }); // reset previous ask

    try {
      const res = await fetch(`${API}/api/index`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: documentId }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || `Index failed (HTTP ${res.status})`);

      setIndexing({ loading: false, data: json, error: null });
    } catch (err) {
      setIndexing({ loading: false, data: null, error: err.message || "Index failed" });
    }
  }

  async function handleAsk() {
    if (!documentId) {
      setAsk({ loading: false, data: null, error: "No document_id found. Upload first." });
      return;
    }

    const q = question.trim();
    if (q.length < 2) {
      setAsk({ loading: false, data: null, error: "Please type a question." });
      return;
    }

    const k = Number(topK);
    if (!Number.isFinite(k) || k < 1 || k > 10) {
      setAsk({ loading: false, data: null, error: "top_k must be between 1 and 10." });
      return;
    }

    setAsk({ loading: true, data: null, error: null });

    try {
      const res = await fetch(`${API}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: documentId, question: q, top_k: k }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || `Ask failed (HTTP ${res.status})`);

      setAsk({ loading: false, data: json, error: null });
    } catch (err) {
      setAsk({ loading: false, data: null, error: err.message || "Ask failed" });
    }
  }

  function scoreLabel(score) {
    if (score == null) return "—";
    if (score < 0.6) return "High";
    if (score < 1.2) return "Medium";
    return "Low";
  }

  function handleResetAll() {
    setSelectedFile(null);
    setUpload({ loading: false, data: null, error: null });
    setExtract({ loading: false, data: null, error: null });
    setSummarize({ loading: false, data: null, error: null });
    setIndexing({ loading: false, data: null, error: null });
    setAsk({ loading: false, data: null, error: null });
    setQuestion("");
    setTopK(4);

    // ✅ This forces the <input type="file"> to reset (remount)
    setFileInputKey((k) => k + 1);
  }

  const healthOk = Boolean(status.data?.ok);

  return (
    <div className="min-h-screen bg-app-bg">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
        <header className="mb-8 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                AI Document Summarizer with RAG
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Upload a PDF, extract text, generate an AI summary, build a vector index, then ask questions powered by
                retrieval-augmented generation.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge tone={status.loading ? "warning" : healthOk ? "success" : "danger"}>
                Backend: {status.loading ? "Checking…" : healthOk ? "Online" : "Offline"}
              </Badge>
              {documentId ? <Badge tone="success">Doc ID: {documentId}</Badge> : null}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-5">
          <Card>
            <CardHeader title="Backend Health" subtitle={API ? API : "Set VITE_API_BASE_URL in frontend/.env"} />

            {status.loading ? <Alert tone="warning">Checking backend…</Alert> : null}
            {status.error ? <Alert tone="danger">{status.error}</Alert> : null}
            {status.data ? <CodePanel>{pretty(status.data)}</CodePanel> : null}
          </Card>

          <Card>
            <SectionHeader
              eyebrow="Step 1"
              title="Upload a PDF"
              subtitle="Upload a document to get a document_id used by the next steps."
            />

            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-dashed border-app-border bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">Choose a PDF file</div>
                    <div className="mt-1 text-xs text-slate-600">We’ll store it and return a document id (PDFs up to 4 pages).</div>
                  </div>
                  <input
                    key={fileInputKey}
                    type="file"
                    accept="application/pdf"
                    className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800 sm:max-w-[360px]"
                    onChange={(e) => {
                      setSelectedFile(e.target.files?.[0] || null);
                      setUpload({ loading: false, data: null, error: null });
                      setExtract({ loading: false, data: null, error: null });
                      setSummarize({ loading: false, data: null, error: null });
                      setIndexing({ loading: false, data: null, error: null });
                      setAsk({ loading: false, data: null, error: null });
                      setQuestion("");
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button type="button" loading={upload.loading} onClick={handleUpload}>
                  {upload.loading ? "Uploading…" : "Upload"}
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleResetAll}
                  disabled={upload.loading || extract.loading || summarize.loading}
                >
                  Reset
                </Button>
                {selectedFile ? (
                  <div className="text-sm text-slate-700">
                    Selected: <span className="font-semibold">{selectedFile.name}</span>{" "}
                    <span className="text-slate-500">({Math.round(selectedFile.size / 1024)} KB)</span>
                  </div>
                ) : null}
              </div>

              {upload.error ? <Alert tone="danger">{upload.error}</Alert> : null}
              {upload.data ? (
                <>
                  <Alert tone="success" title="Upload successful">
                    Document ID: <span className="font-semibold">{upload.data.document_id}</span>
                  </Alert>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-app-border bg-white p-4">
                      <div className="text-xs font-medium text-slate-500">Document ID</div>
                      <div className="mt-1 break-words text-sm font-semibold text-slate-900">
                        {upload.data.document_id}
                      </div>
                    </div>
                    <div className="rounded-xl border border-app-border bg-white p-4">
                      <div className="text-xs font-medium text-slate-500">Filename</div>
                      <div className="mt-1 break-words text-sm font-semibold text-slate-900">
                        {upload.data.filename}
                      </div>
                    </div>
                    <div className="rounded-xl border border-app-border bg-white p-4">
                      <div className="text-xs font-medium text-slate-500">Size</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{upload.data.size_bytes} bytes</div>
                    </div>
                  </div>
                  <CodePanel>{pretty(upload.data)}</CodePanel>
                </>
              ) : null}
            </div>
          </Card>

          <Card>
            <SectionHeader
              eyebrow="Step 2"
              title="Extract text"
              subtitle="Reads the stored PDF (max 4 pages) and extracts text for summarization and indexing."
            />

            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
              <Field label="Max pages" hint="1–4 pages.">
                <NumberInput
                  type="number"
                  min={1}
                  max={4}
                  value={maxPages}
                  onChange={(e) => setMaxPages(e.target.value)}
                  disabled={!canExtract || extract.loading}
                  className="max-w-[160px]"
                />
              </Field>

              <Button loading={extract.loading} onClick={handleExtract} disabled={!canExtract}>
                {extract.loading ? "Extracting…" : "Extract"}
              </Button>
            </div>

            {!documentId ? <Alert tone="info">Upload a PDF first to enable extraction.</Alert> : null}
            {extract.error ? <Alert tone="danger">{extract.error}</Alert> : null}

            {extract.data ? (
              <>
                {extract.data.message ? <Alert tone="warning">{extract.data.message}</Alert> : null}
                <Alert tone="success" title="Extraction complete">
                  Text length: <span className="font-semibold">{extract.data.text_length}</span>
                </Alert>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-app-border bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">Pages processed</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{extract.data.pages_processed}</div>
                  </div>
                  <div className="rounded-xl border border-app-border bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">Text length</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{extract.data.text_length}</div>
                  </div>
                </div>

                <div className="mt-4 text-sm font-semibold text-slate-900">Preview</div>
                <CodePanel tone="light">
                  {extract.data.preview || "(empty preview)"}
                </CodePanel>
              </>
            ) : null}
          </Card>

          <Card>
            <SectionHeader
              eyebrow="Step 3"
              title="Generate summary"
              subtitle="Creates a structured summary using Gemini via LangChain."
            />

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button loading={summarize.loading} onClick={handleSummarize} disabled={!canSummarize}>
                {summarize.loading ? "Summarizing…" : "Summarize"}
              </Button>
              {!canSummarize ? (
                <div className="text-sm text-slate-600">Run Extract first (and ensure it found text).</div>
              ) : null}
            </div>

            {summarize.error ? <Alert tone="danger">{summarize.error}</Alert> : null}

            {summarize.data ? (
              <>
                <Alert tone="success" title="Summary generated" />

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-app-border bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">Chunks used</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{summarize.data.chunks_used}</div>
                  </div>
                  <div className="rounded-xl border border-app-border bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">Chunk size</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{summarize.data.chunk_size}</div>
                  </div>
                  <div className="rounded-xl border border-app-border bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">Truncated</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {summarize.data.truncated ? "Yes (cost guardrail)" : "No"}
                    </div>
                  </div>
                </div>

                {summarize.data.truncated ? (
                  <Alert tone="warning">
                    Summary was generated using the first {summarize.data.chunks_used} chunks to control cost/latency.
                  </Alert>
                ) : null}

                <div className="mt-4 rounded-xl border border-app-border bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">Summary</div>
                  <div className="mt-3">{renderSummary(summarize.data.summary)}</div>
                </div>

                <div className="mt-4 text-sm font-semibold text-slate-900">Raw JSON</div>
                <CodePanel>{pretty(summarize.data)}</CodePanel>
              </>
            ) : null}
          </Card>

          <Card>
            <SectionHeader
              eyebrow="Step 4"
              title="Index document (RAG)"
              subtitle="Builds a vector index (FAISS) for semantic retrieval."
            />

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button loading={indexing.loading} onClick={handleIndex} disabled={!canIndex}>
                {indexing.loading ? "Indexing…" : "Index"}
              </Button>
              {!canIndex ? <div className="text-sm text-slate-600">Run Extract first (and ensure it found text).</div> : null}
            </div>

            {indexing.error ? <Alert tone="danger">{indexing.error}</Alert> : null}

            {indexing.data ? (
              <>
                <Alert tone="success" title="Index created" />

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-app-border bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">Chunks indexed</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{indexing.data.chunks_indexed}</div>
                  </div>
                  <div className="rounded-xl border border-app-border bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">Chunk size</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{indexing.data.chunk_size}</div>
                  </div>
                  <div className="rounded-xl border border-app-border bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">Overlap</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{indexing.data.chunk_overlap}</div>
                  </div>
                </div>

                <div className="mt-4 text-sm font-semibold text-slate-900">Raw JSON</div>
                <CodePanel>{pretty(indexing.data)}</CodePanel>
              </>
            ) : null}
          </Card>

          <Card>
            <SectionHeader
              eyebrow="Step 5"
              title="Ask questions (RAG)"
              subtitle="Retrieves relevant chunks and answers using Gemini."
            />

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_160px_auto] sm:items-end">
              <Field label="Question" hint="Ask something specific so retrieval can find relevant chunks.">
                <TextInput
                  type="text"
                  placeholder="e.g., What are the key points? Any action items?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={!canAsk || ask.loading}
                />
              </Field>

              <Field label="top_k" hint="1–10">
                <NumberInput
                  type="number"
                  min={1}
                  max={10}
                  value={topK}
                  onChange={(e) => setTopK(e.target.value)}
                  disabled={!canAsk || ask.loading}
                />
              </Field>

              <Button loading={ask.loading} onClick={handleAsk} disabled={!canAsk}>
                {ask.loading ? "Asking…" : "Ask"}
              </Button>
            </div>

            {!canAsk ? <Alert tone="info">Run Index first to enable Q&A.</Alert> : null}
            {ask.error ? <Alert tone="danger">{ask.error}</Alert> : null}

            {ask.data ? (
              <>
                <Alert tone="success" title="Answer" />

                <div className="mt-3 rounded-xl border border-app-border bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">Response</div>
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{ask.data.answer}</div>
                </div>

                {ask.data.sources?.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-app-border bg-white p-4">
                    <div className="text-sm font-semibold text-slate-900">Sources</div>
                    <div className="mt-3 space-y-3">
                      {ask.data.sources.map((s, idx) => (
                        <div key={idx} className="rounded-xl border border-app-border bg-slate-50 p-4">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-semibold text-slate-900">Chunk #{s.chunk_id}</span>
                            <span className="text-slate-600">
                              Score: <span className="font-medium text-slate-900">{s.score?.toFixed?.(3) ?? s.score}</span>
                            </span>
                            <span className="text-slate-600">
                              Relevance: <span className="font-medium text-slate-900">{scoreLabel(s.score)}</span>
                            </span>
                          </div>
                          <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{s.preview}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 text-sm font-semibold text-slate-900">Raw JSON</div>
                <CodePanel>{pretty(ask.data)}</CodePanel>
              </>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}