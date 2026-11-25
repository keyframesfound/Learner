import Link from "next/link";
import { chapters, subjects } from "@/lib/content";

export default async function Chapters({ params }: { params: Promise<{ subject: string }> }) {
  const { subject } = await params;
  const s = subjects.find((x) => x.id === subject) ?? subjects[0]!;
  const read = chapters.reduce((n, c) => n + c.read, 0);
  const total = chapters.reduce((n, c) => n + c.fragments, 0);

  return (
    <>
      <div className="hd">
        <Link href="/quickbits" className="linkish">✕</Link>
        <span className="mod">{s.name}</span>
        <span className="mod dim">{read} of {total} read</span>
      </div>

      <div className="sub" style={{ paddingTop: 14 }}>Choose a chapter</div>

      <div className="rows">
        {chapters.map((c) => (
          <Link key={c.id} href={`/quickbits/${s.id}/${c.id}`} className={"row " + (c.read === 0 ? "lock" : "")}>
            <span className="no">{c.no}</span>
            <span className="txt">
              <b>{c.title}</b>
              <span>{c.read} of {c.fragments} read</span>
            </span>
            <span className="mono" style={{ fontSize: 12 }}>{c.read === c.fragments ? "✓" : "→"}</span>
          </Link>
        ))}
      </div>
      <div style={{ height: 24 }} />
    </>
  );
}
