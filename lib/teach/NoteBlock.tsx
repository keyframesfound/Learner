"use client";

import Link from "next/link";
import { deleteBlockAction, updateBlockAction } from "@/app/teach/content-actions";

export type BlockView =
  | { kind: "note"; text: string }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "callout"; text: string };

type Props = {
  lessonId: string;
  blockId: string;
  kind: "prose" | "callout";
  md: string;
  label: string;
  view: BlockView;
  selected: boolean;
  href: string;
};

/* the notes are written in a little markdown: **bold** is the only inline mark */
function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.length > 4 && part.startsWith("**") && part.endsWith("**")
      ? <b key={i}>{part.slice(2, -2)}</b>
      : part,
  );
}
const plain = (s: string) => s.replace(/\*\*/g, "");

function View({ view }: { view: BlockView }) {
  if (view.kind === "table") {
    const cells = [...view.head, ...view.rows.flat()];
    return (
      <div className="tbl" style={{ gridTemplateColumns: `repeat(${Math.max(1, view.head.length)}, minmax(0, 1fr))` }}>
        {cells.map((cell, i) => <div key={i}>{plain(cell)}</div>)}
      </div>
    );
  }
  if (view.kind === "callout") {
    return <div className="callout"><b>Marking</b><span>{inline(view.text)}</span></div>;
  }
  return <div className="fld">{inline(view.text)}</div>;
}

export default function NoteBlock({ lessonId, blockId, kind, md, label, view, selected, href }: Props) {
  const heading = (
    <div className="bk"><span className="grip">⋮⋮</span>{plain(label)}</div>
  );

  if (!selected) {
    return (
      <Link className="blk" href={href}>
        {heading}
        <View view={view} />
      </Link>
    );
  }

  const rows = Math.min(14, Math.max(3, Math.ceil(md.length / 70)));

  return (
    <div className="blk sel">
      {heading}
      <form action={updateBlockAction}>
        <input type="hidden" name="lessonId" value={lessonId} />
        <input type="hidden" name="blockId" value={blockId} />
        <input type="hidden" name="kind" value={kind} />
        <textarea className="fld" name="md" defaultValue={md} rows={rows} required />
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
          <button type="submit" className="b sm solid">Save</button>
          <button
            type="submit"
            className="b sm"
            formAction={deleteBlockAction}
            formNoValidate
            onClick={(event) => {
              if (!window.confirm("Delete this block?")) event.preventDefault();
            }}
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  );
}
