import { useEffect, useMemo, useState } from "react";
import "./App.css";

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
        <ul key={`ul-${blocks.length}`}>
          {currentList.map((item, idx) => (
            <li key={idx}>{item}</li>
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
      blocks.push(<h3 key={`h-${blocks.length}`}>{headerMatch[1]}</h3>);
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
    blocks.push(<p key={`p-${blocks.length}`}>{line}</p>);
  }

  flushList();

  return <div className="summary">{blocks}</div>;
}

export default function App() {
  const API = import.meta.env.VITE_API_BASE_URL;

  // Health check
  const [status, setStatus] = useState({ loading: true, data: null, error: null });

  // Upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [upload, setUpload] = useState({ loading: false, data: null, error: null });

  // Extract
  const [maxPages, setMaxPages] = useState(30);
  const [extract, setExtract] = useState({ loading: false, data: null, error: null });

  // Summarize
  const [summarize, setSummarize] = useState({ loading: false, data: null, error: null });

  const [fileInputKey, setFileInputKey] = useState(0);

  const documentId = upload?.data?.document_id || null;
  const canExtract = Boolean(documentId) && !upload.loading;
  const canSummarize = Boolean(extract?.data?.text_length > 0) && !extract.loading;

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
    if (!Number.isFinite(pages) || pages < 1 || pages > 200) {
      setExtract({ loading: false, data: null, error: "max_pages must be between 1 and 200." });
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

  function handleResetAll() {
    setSelectedFile(null);
    setUpload({ loading: false, data: null, error: null });
    setExtract({ loading: false, data: null, error: null });
    setSummarize({ loading: false, data: null, error: null });

    // ✅ This forces the <input type="file"> to reset (remount)
    setFileInputKey((k) => k + 1);
  }

  const healthOk = Boolean(status.data?.ok);

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <h1>AI Document Summarizer</h1>
          <p className="subtitle">Upload → Extract → Summarize (React + FastAPI + LangChain + Gemini)</p>
        </div>

        <div className="pillRow">
          <div className="pill">
            <span className={`pillDot ${healthOk ? "dotGood" : status.loading ? "dotWarn" : "dotBad"}`} />
            Backend: {status.loading ? "Checking..." : healthOk ? "Online" : "Offline"}
          </div>

          {documentId && (
            <div className="pill">
              <span className="pillDot dotGood" />
              Doc ID: {documentId}
            </div>
          )}
        </div>
      </div>

      <div className="grid">
        {/* Health Card */}
        <div className="card">
          <div className="cardHeader">
            <h2 className="cardTitle">Backend Health</h2>
            <p className="cardHint">{API ? API : "Set VITE_API_BASE_URL in frontend/.env"}</p>
          </div>

          {status.loading && <div className="msg msgWarn">Checking backend...</div>}
          {status.error && <div className="msg msgBad">❌ {status.error}</div>}

          {status.data && (
            <div className="box">
              <pre>{pretty(status.data)}</pre>
            </div>
          )}
        </div>

        {/* Upload Card */}
        <div className="card">
          <div className="cardHeader">
            <h2 className="cardTitle">1) Upload PDF</h2>
            <p className="cardHint">Uploads file and returns document_id</p>
          </div>

          <form onSubmit={handleUpload} className="row">
            <input
              key={fileInputKey}
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                setSelectedFile(e.target.files?.[0] || null);
                setUpload({ loading: false, data: null, error: null });
                setExtract({ loading: false, data: null, error: null });
                setSummarize({ loading: false, data: null, error: null });
              }}
            />

            <button className="btnPrimary" type="submit" disabled={upload.loading}>
              {upload.loading ? "Uploading..." : "Upload"}
            </button>

            <button
              className="btnGhost"
              type="button"
              onClick={handleResetAll}
              disabled={upload.loading || extract.loading || summarize.loading}
            >
              Reset
            </button>
          </form>

          {selectedFile && (
            <div className="msg">
              Selected: <strong>{selectedFile.name}</strong> ({Math.round(selectedFile.size / 1024)} KB)
            </div>
          )}

          {upload.error && <div className="msg msgBad">❌ {upload.error}</div>}

          {upload.data && (
            <>
              <div className="msg msgGood">✅ Upload successful</div>
              <div className="kv">
                <div className="kLabel">Document ID</div>
                <div className="kValue">{upload.data.document_id}</div>
                <div className="kLabel">Filename</div>
                <div className="kValue">{upload.data.filename}</div>
                <div className="kLabel">Size</div>
                <div className="kValue">{upload.data.size_bytes} bytes</div>
              </div>

              <div className="box">
                <pre>{pretty(upload.data)}</pre>
              </div>
            </>
          )}
        </div>

        {/* Extract Card */}
        <div className="card">
          <div className="cardHeader">
            <h2 className="cardTitle">2) Extract Text</h2>
            <p className="cardHint">Reads stored PDF and saves extracted text</p>
          </div>

          <div className="row">
            <label className="row" style={{ gap: 8 }}>
              <span style={{ color: "rgba(255,255,255,0.7)" }}>Max pages</span>
              <input
                type="number"
                min={1}
                max={200}
                value={maxPages}
                onChange={(e) => setMaxPages(e.target.value)}
                disabled={!canExtract || extract.loading}
              />
            </label>

            <button className="btnPrimary" onClick={handleExtract} disabled={!canExtract || extract.loading}>
              {extract.loading ? "Extracting..." : "Extract"}
            </button>
          </div>

          {!documentId && <div className="msg">Upload a PDF first to enable extraction.</div>}

          {extract.error && <div className="msg msgBad">❌ {extract.error}</div>}

          {extract.data && (
            <>
              {extract.data.message && <div className="msg msgWarn">⚠️ {extract.data.message}</div>}
              <div className="msg msgGood">✅ Extraction complete</div>

              <div className="kv">
                <div className="kLabel">Pages processed</div>
                <div className="kValue">{extract.data.pages_processed}</div>
                <div className="kLabel">Text length</div>
                <div className="kValue">{extract.data.text_length}</div>
              </div>

              <hr className="sep" />

              <div className="cardHint">Preview</div>
              <div className="box">
                <pre>{extract.data.preview || "(empty preview)"}</pre>
              </div>
            </>
          )}
        </div>

        {/* Summary Card */}
        <div className="card">
          <div className="cardHeader">
            <h2 className="cardTitle">3) Summary</h2>
            <p className="cardHint">Uses Gemini via LangChain to generate summary</p>
          </div>

          <div className="row">
            <button className="btnPrimary" onClick={handleSummarize} disabled={!canSummarize || summarize.loading}>
              {summarize.loading ? "Summarizing..." : "Summarize"}
            </button>
          </div>

          {!canSummarize && <div className="msg">Run Extract first (and make sure it found text) to enable summarization.</div>}

          {summarize.error && <div className="msg msgBad">❌ {summarize.error}</div>}

          {summarize.data && (
            <>
              <div className="msg msgGood">✅ Summary generated</div>

              {/* NEW: summary metadata */}
              <div className="kv" style={{ marginTop: 10 }}>
                <div className="kLabel">Chunks used</div>
                <div className="kValue">{summarize.data.chunks_used}</div>

                <div className="kLabel">Chunk size</div>
                <div className="kValue">{summarize.data.chunk_size}</div>

                <div className="kLabel">Truncated</div>
                <div className="kValue">
                  {summarize.data.truncated ? "Yes (cost guardrail)" : "No"}
                </div>
              </div>

              {summarize.data.truncated && (
                <div className="msg msgWarn">
                  ⚠️ Summary was generated using the first {summarize.data.chunks_used} chunks to control cost/latency.
                </div>
              )}

              <div className="box">{renderSummary(summarize.data.summary)}</div>

              <hr className="sep" />

              <div className="cardHint">Raw JSON</div>
              <div className="box">
                <pre>{pretty(summarize.data)}</pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}