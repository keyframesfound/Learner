"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-HK">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#F2EFE6",
          color: "#111111",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          textAlign: "center",
        }}
      >
        <main style={{ display: "grid", gap: 12, justifyItems: "center", maxWidth: 340 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: "#8C8A80" }}>
            SOMETHING WENT WRONG
          </p>
          <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1.2 }}>
            Something broke on our side.
          </h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "#4A4A45" }}>
            Your work is safe. Reload the page and try again.
          </p>
          {error.digest ? (
            <p style={{ margin: 0, fontSize: 11, color: "#8C8A80" }}>Reference {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 8,
              minHeight: 48,
              padding: "0 22px",
              border: "3px solid #111111",
              borderRadius: 8,
              background: "#111111",
              color: "#D4FF3F",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: ".6px",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <a href="/learner" style={{ fontSize: 12, color: "#4A4A45" }}>
            Back to Learn
          </a>
        </main>
      </body>
    </html>
  );
}
