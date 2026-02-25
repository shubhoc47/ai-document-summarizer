import { useEffect, useState } from "react";

export default function App() {
  const API = import.meta.env.VITE_API_BASE_URL;

  // Health check state
  const [status, setStatus] = useState({
    loading: true,
    data: null,
    error: null,
  });

  // upload state

  useEffect(() => {
    const api = import.meta.env.VITE_API_BASE_URL;

    fetch(`${api}/health`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Server error");
        const json = await res.json();
        setStatus({ loading: false, data: json, error: null });
      })
      .catch((err) => {
        setStatus({ loading: false, data: null, error: err.message });
      });
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>AI Document Summarizer</h1>
      <p>React + FastAPI + LangChain + AWS</p>

      <div style={{ marginTop: 20, padding: 20, border: "1px solid #ddd", borderRadius: 8 }}>
        <h2>Backend Health Check</h2>

        {status.loading && <p>Checking backend...</p>}

        {status.error && (
          <p style={{ color: "red" }}>
            Backend not reachable: {status.error}
          </p>
        )}

        {status.data && (
          <pre style={{ background: "#f4f4f4", padding: 12 }}>
            {JSON.stringify(status.data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}