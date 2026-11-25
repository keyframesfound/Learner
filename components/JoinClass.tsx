"use client";

import { useState, useTransition } from "react";

type JoinResult = { error?: string; ok?: boolean; className?: string };

export default function JoinClass({ action }: { action: (fd: FormData) => Promise<JoinResult> }) {
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await action(formData);
      if (res.error) setError(res.error);
      else setJoined(res.className ?? "your class");
    });
  }

  return (
    <form className="field" action={submit}>
      <label className="field">
        <span className="label">Class code</span>
        <input
          className="input"
          name="code"
          placeholder="ABC123"
          autoComplete="off"
          maxLength={8}
          required
        />
      </label>
      {error && (
        <p className="mono" role="alert" style={{ fontSize: 10.5, color: "var(--red-ink)" }}>{error}</p>
      )}
      {joined && (
        <p className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>
          Joined {joined}.
        </p>
      )}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Joining…" : "Join class"}
      </button>
    </form>
  );
}
