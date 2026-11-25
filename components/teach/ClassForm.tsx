"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createClassAction } from "@/app/teach/class-actions";

type Module = {
  id: string;
  code: string;
  name: string;
  track_name: string;
  lessons: number;
};

function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending }: { pending: boolean } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? busy : idle}
    </button>
  );
}

export function ClassForm({ modules, error }: { modules: Module[]; error?: string | null }) {
  return (
    <form action={createClassAction} style={{ display: "grid", gap: 12 }}>
      <div className="field">
        <label className="label" htmlFor="class-name">Class name</label>
        <input
          id="class-name"
          className="input"
          name="name"
          maxLength={40}
          required
          autoComplete="off"
          placeholder="e.g. 4B ICT"
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="class-module">Curriculum</label>
        <select id="class-module" className="select" name="moduleId" defaultValue="">
          <option value="">No curriculum yet</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.code} · {m.name} ({m.lessons} {m.lessons === 1 ? "lesson" : "lessons"})
            </option>
          ))}
        </select>
        <p className="hint">Students drill the module you pick here. You can change it later.</p>
      </div>

      {error ? <p className="hint" style={{ color: "var(--red-ink)" }}>{error}</p> : null}

      <SubmitButton idle="Create class" busy="Creating…" />
    </form>
  );
}

export function CodeChip({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span className="mono" style={{ fontSize: 17, fontWeight: 700, letterSpacing: 2 }}>{code}</span>
      <button
        type="button"
        className="btn sm ghost"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function ConfirmDelete({ id, action }: { id: string; action: (formData: FormData) => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Delete this class? Students will be unenrolled and the join code stops working.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <DeleteButton />
    </form>
  );
}

function DeleteButton() {
  const { pending }: { pending: boolean } = useFormStatus();
  return (
    <button type="submit" className="btn danger" disabled={pending}>
      {pending ? "Deleting…" : "Delete class"}
    </button>
  );
}
