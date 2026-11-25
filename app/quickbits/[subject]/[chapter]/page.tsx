import Link from "next/link";
import { chapters, fragments, subjects } from "@/lib/content";

export default async function Fragments({ params }: { params: Promise<{ subject: string; chapter: string }> }) {
  const { subject, chapter } = await params;
  const s = subjects.find((x) => x.id === subject) ?? subjects[0]!;
  const c = chapters.find((x) => x.id === chapter) ?? chapters[0]!;
  const read = fragments.filter((f) => f.read).length;

  return (
    <>
      <div className="hd">
        <Link href={`/quickbits/${s.id}`} className="linkish">←</Link>
        <span className="mod">{c.title}</span>
        <span className="mod dim">{read} of {fragments.length}</span>
      </div>

      <div className="rows">
        {fragments.map((f) => (
          <Link key={f.id} href={`/quickbits/${s.id}/${c.id}/${f.id}`}
            className={"row " + (f.read ? "done" : "")}>
            <span className="no">{f.no}</span>
            <span className="txt"><b>{f.title}</b><span>{f.read ? "read" : "not read"}</span></span>
            <span className="mono" style={{ fontSize: 12 }}>{f.read ? "✓" : "→"}</span>
          </Link>
        ))}
      </div>
      <div style={{ height: 24 }} />
    </>
  );
}
