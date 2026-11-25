"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { chapter: string; fragment: string; read?: boolean };

export default function MarkRead({ chapter, fragment, read = false }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(read);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  if (saved) return <span className="badge">Read</span>;

  async function mark() {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/learner/api/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chapter, fragment }),
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn ghost" type="button" onClick={mark} disabled={busy}>
        {busy ? "Saving…" : "Mark as read"}
      </button>
      {error && (
        <p className="mono" role="alert" style={{ fontSize: 10.5, color: "var(--red-ink)", textAlign: "center", marginTop: 8 }}>
          Could not save — try again.
        </p>
      )}
    </>
  );
}
