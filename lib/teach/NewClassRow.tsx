"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createClassAction } from "@/app/teach/class-actions";

type Module = { id: string; name: string; code: string; lessons: number };

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="b sm solid" disabled={pending}>
      {pending ? "Creating…" : "Create"}
    </button>
  );
}

/**
 * The classes page adds a class the way the questions page adds a question: a
 * dashed row at the top of the table that opens in place. The right-hand form is
 * gone — the row is where the eye already is.
 */
export default function NewClassRow({ modules }: { modules: Module[] }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="addqbtn" onClick={() => setOpen(true)}>
        <span><b aria-hidden="true">+</b> New class</span>
      </button>
    );
  }

  return (
    <form action={createClassAction} className="addclass">
      <input
        className="fld"
        name="name"
        maxLength={40}
        required
        autoFocus
        autoComplete="off"
        placeholder="Class name, e.g. 4D"
        aria-label="Class name"
      />
      <select className="sel" name="moduleId" defaultValue={modules[0]?.id ?? ""} aria-label="Curriculum">
        <option value="">No curriculum yet</option>
        {modules.map((module) => (
          <option key={module.id} value={module.id}>
            {module.name} · {module.lessons} {module.lessons === 1 ? "chapter" : "chapters"}
          </option>
        ))}
      </select>
      <CreateButton />
      <button type="button" className="b sm" onClick={() => setOpen(false)}>Cancel</button>
    </form>
  );
}
