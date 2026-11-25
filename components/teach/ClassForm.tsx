"use client";

import { useFormStatus } from "react-dom";
import { createClassAction } from "@/app/teach/class-actions";

type Module = { id: string; name: string; code: string; lessons: number };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="b solid" disabled={pending}>
      {pending ? "Creating…" : "Create class"}
    </button>
  );
}

export default function ClassForm({ modules, error }: { modules: Module[]; error?: string | null }) {
  return (
    <form action={createClassAction} className="newc">
      <div className="lbl">New class</div>

      <div className="fl">Class name</div>
      <input
        className="fld"
        name="name"
        maxLength={40}
        required
        autoComplete="off"
        placeholder="e.g. 4D"
        aria-label="Class name"
      />

      <div className="fl">Curriculum</div>
      <select className="sel" name="moduleId" defaultValue={modules[0]?.id ?? ""} aria-label="Curriculum">
        <option value="">No curriculum yet</option>
        {modules.map((module) => (
          <option key={module.id} value={module.id}>
            {module.name} · {module.lessons} {module.lessons === 1 ? "chapter" : "chapters"}
          </option>
        ))}
      </select>

      {error ? <p className="hint" role="alert" style={{ color: "var(--red-ink)" }}>{error}</p> : null}

      <div className="hint">Content lives in the curriculum, not the class. Two classes on the same curriculum share every note and question.</div>

      <SubmitButton />

      <div className="hint">A join code is generated when the class is created.</div>
    </form>
  );
}
