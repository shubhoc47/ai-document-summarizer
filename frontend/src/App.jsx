import { useEffect, useState } from "react";

export default function App() {
  const API = import.meta.env.VITE_API_BASE_URL;

  // Health check state (same as before)
  const [status, setStatus] = useState({
    loading: true,
    data: null,
    error: null,
  });

  // Upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [upload, setUpload] = useState({
    loading: false,
    data: null,
    error: null,
  });

  useEffect(() => {
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

    if (!selectedFile) {
      setUpload({ loading: false, data: null, error: "Please select a PDF file first." });
      return;
    }

    // Basic client-side check (server will also validate)
    if (selectedFile.type !== "application/pdf") {
      setUpload({ loading: false, data: null, error: "Only PDF files are allowed." });
      return;
    }

    setUpload({ loading: true, data: null, error: null });

    try {
      const form = new FormData();
      form.append("file", selectedFile); // must match FastAPI param name: file

      const res = await fetch(`${API}/api/upload`, {
        method: "POST",
        body: form,
      });

      const json = await res.json();
      if (!res.ok) {
        // FastAPI errors look like { detail: "..." }
        throw new Error(json?.detail || `Upload failed (HTTP ${res.status})`);
      }

      setUpload({ loading: false, data: json, error: null });
    } catch (err) {
      setUpload({ loading: false, data: null, error: err.message || "Upload failed" });
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "system-ui", padding: 16 }}>
      <h1>AI Document Summarizer (V1)</h1>
      <p>React + FastAPI + LangChain + AWS</p>

      {/* Backend Health */}
      <div style={{ marginTop: 20, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
        <h2>Backend Health Check</h2>

        {status.loading && <p>Checking backend...</p>}

        {status.error && (
          <p style={{ color: "crimson" }}>
            ❌ Backend not reachable: {status.error}
          </p>
        )}

        {status.data && (
          <pre style={{ background: "#f4f4f4", padding: 12, borderRadius: 8 }}>
            {JSON.stringify(status.data, null, 2)}
          </pre>
        )}
      </div>

      {/* Upload */}
      <div style={{ marginTop: 20, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
        <h2>Upload PDF</h2>

        <form onSubmit={handleUpload}>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              setSelectedFile(e.target.files?.[0] || null);
              setUpload({ loading: false, data: null, error: null }); // reset upload status
            }}
          />

          <div style={{ marginTop: 12 }}>
            <button type="submit" disabled={upload.loading}>
              {upload.loading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>

        {selectedFile && (
          <p style={{ marginTop: 10 }}>
            Selected: <b>{selectedFile.name}</b> ({Math.round(selectedFile.size / 1024)} KB)
          </p>
        )}

        {upload.error && (
          <p style={{ marginTop: 12, color: "crimson" }}>❌ {upload.error}</p>
        )}

        {upload.data && (
          <div style={{ marginTop: 12 }}>
            <p style={{ color: "green" }}>✅ Upload successful!</p>
            <pre style={{ background: "#f4f4f4", padding: 12, borderRadius: 8 }}>
              {JSON.stringify(upload.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}