"use client";

import { useState } from "react";
import { addProseAction } from "@/app/teach/content-actions";

type Kind = "note" | "table" | "callout";

const PLACEHOLDER: Record<Kind, string> = {
  note: "In summer the south-west monsoon carries warm, moist air from the sea.",
  table: "| Summer | Winter |\n| South-west monsoon | North-east monsoon |",
  callout: "Name the wind direction, not just “moist air”. The mark is for the direction and the source region.",
};

export default function AddBlock({
  lessonId,
  back,
  openWhenNew,
}: {
  lessonId: string;
  back: string;
  openWhenNew: boolean;
}) {
  const [open, setOpen] = useState(openWhenNew);
  const [kind, setKind] = useState<Kind>("note");

  if (!open) {
    return (
      <button type="button" className="addblk" onClick={() => setOpen(true)}>
        + Add block
      </button>
    );
  }

  return (
    <form action={addProseAction} className="newc" style={{ boxShadow: "none", marginTop: 8 }}>
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="back" value={back} />
      <div className="lbl">New block</div>

      <div className="fl">Kind</div>
      <select
        className="sel"
        name="type"
        value={kind}
        onChange={(event) => setKind(event.target.value as Kind)}
      >
        <option value="note">Note</option>
        <option value="table">Table</option>
        <option value="callout">Exam callout</option>
      </select>

      <div className="fl">Text</div>
      <textarea
        className="fld"
        name="md"
        rows={kind === "table" ? 5 : 4}
        required
        placeholder={PLACEHOLDER[kind]}
      />

      {kind === "table" ? (
        <div className="hint">One row per line, each wrapped in | pipes |. The first row is the header.</div>
      ) : null}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="b sm solid">Add block</button>
        <button type="button" className="b sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
