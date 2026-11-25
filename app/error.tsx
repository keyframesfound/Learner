"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "40px 20px 96px" }}>
      <div style={{ display: "grid", gap: 12, justifyItems: "center", textAlign: "center", maxWidth: 320 }}>
        <div className="mono" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1.2, color: "var(--ink-3)" }}>
          SOMETHING WENT WRONG
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 23, letterSpacing: "-.7px", lineHeight: 1.15 }}>
          {"Something broke on our side."}
        </h1>
        <p className="hint" style={{ fontSize: 10 }}>
          Your work is safe. Reload the page and try again.
        </p>
        {error.digest ? (
          <p className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>
            Reference {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          className="btn"
          onClick={() => reset()}
          style={{ marginTop: 6, maxWidth: 240 }}
        >
          Try again
        </button>
        <Link href="/" className="mono" style={{ fontSize: 10, color: "var(--ink-2)" }}>
          Back to Learn
        </Link>
      </div>
    </div>
  );
}
