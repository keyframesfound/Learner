import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "40px 20px 96px" }}>
      <div style={{ display: "grid", gap: 12, justifyItems: "center", textAlign: "center", maxWidth: 320 }}>
        <div className="mono" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1.2, color: "var(--ink-3)" }}>
          ERROR 404
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 92, lineHeight: 0.9, letterSpacing: "-5px" }}>
          404
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 21, letterSpacing: "-.6px", lineHeight: 1.15 }}>
          {"That page isn't here."}
        </h1>
        <p className="hint" style={{ fontSize: 10, marginBottom: 6 }}>
          The link may be old, or the page moved.
        </p>
        <Link
          href="/"
          className="btn"
          style={{ display: "grid", placeItems: "center", textDecoration: "none", maxWidth: 240 }}
        >
          Back to Learn
        </Link>
      </div>
    </div>
  );
}
