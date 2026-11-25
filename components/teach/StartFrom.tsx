"use client";

import { useState } from "react";

type Module = { id: string; name: string };

export default function StartFrom({ modules }: { modules: Module[] }) {
  const [mode, setMode] = useState<"empty" | "copy">("empty");

  return (
    <>
      <div className="fl" style={{ marginTop: 6 }}>Start from</div>

      <label className={"radio" + (mode === "empty" ? " on" : "")}>
        <input
          type="radio"
          name="mode"
          value="empty"
          checked={mode === "empty"}
          onChange={() => setMode("empty")}
        />
        <u />
        Start empty
      </label>

      <label className={"radio" + (mode === "copy" ? " on" : "")}>
        <input
          type="radio"
          name="mode"
          value="copy"
          checked={mode === "copy"}
          onChange={() => setMode("copy")}
          disabled={modules.length === 0}
        />
        <u />
        Copy the chapter structure from
      </label>

      <select
        className="sel"
        name="copyFrom"
        defaultValue={modules[0]?.id ?? ""}
        disabled={mode !== "copy" || modules.length === 0}
        aria-label="Copy chapters from"
      >
        {modules.length === 0 ? <option value="">No chapters to copy yet</option> : null}
        {modules.map((module) => (
          <option key={module.id} value={module.id}>{module.name}</option>
        ))}
      </select>
    </>
  );
}
