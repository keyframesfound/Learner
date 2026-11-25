import Link from "next/link";
import { notFound } from "next/navigation";
import { chapters, subjects } from "@/lib/content";
import { getReads, viewer } from "@/lib/repo";

export default async function Chapters({ params }: { params: Promise<{ subject: string }> }) {
  const { subject } = await params;
  const s = subjects.find((x) => x.id === subject);
  if (!s) notFound();

  if (s.id !== "ict") {
    return (
      <>
        <div className="hd">
          <Link href="/quickbits" className="linkish">✕</Link>
          <span className="mod">{s.name}</span>
          <span className="mod dim">coming soon</span>
        </div>
        <div style={{ padding: "18px 16px 0" }}>
          <div className="empty">
            <b>Notes for this subject are coming — drills are live now.</b>
            <Link href="/drill" className="btn sm"
              style={{ display: "inline-grid", placeItems: "center", marginTop: 12, textDecoration: "none" }}>
              Start a drill
            </Link>
          </div>
        </div>
        <div style={{ height: 24 }} />
      </>
    );
  }

  const v = await viewer();
  const reads = v ? await getReads(v.id) : new Set<string>();
  const readIn = (id: string) => {
    let n = 0;
    for (const k of reads) if (k.startsWith(id + "/")) n++;
    return n;
  };
  const read = chapters.reduce((n, c) => n + readIn(c.id), 0);
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
        {chapters.map((c) => {
          const done = readIn(c.id);
          return (
            <Link key={c.id} href={`/quickbits/${s.id}/${c.id}`} className={"row " + (done === 0 ? "lock" : "")}>
              <span className="no">{c.no}</span>
              <span className="txt">
                <b>{c.title}</b>
                <span>{done} of {c.fragments} read</span>
              </span>
              <span className="mono" style={{ fontSize: 12 }}>{done === c.fragments ? "✓" : "→"}</span>
            </Link>
          );
        })}
      </div>
      <div style={{ height: 24 }} />
    </>
  );
}
