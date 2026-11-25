import Link from "next/link";
import { notFound } from "next/navigation";
import { chapters, fragments, subjects } from "@/lib/content";
import { getReads, viewer } from "@/lib/repo";

export default async function Fragments({ params }: { params: Promise<{ subject: string; chapter: string }> }) {
  const { subject, chapter } = await params;
  const s = subjects.find((x) => x.id === subject);
  const c = chapters.find((x) => x.id === chapter);
  if (!s || !c) notFound();

  const list = s.id === "ict" && c.id === "hardware" ? fragments : [];

  const v = await viewer();
  const reads = v ? await getReads(v.id) : new Set<string>();
  const isRead = (id: string) => reads.has(`${c.id}/${id}`);
  const read = list.filter((f) => isRead(f.id)).length;

  return (
    <>
      <div className="hd">
        <Link href={`/quickbits/${s.id}`} className="linkish">←</Link>
        <span className="mod">{c.title}</span>
        <span className="mod dim">{read} of {list.length}</span>
      </div>

      {list.length === 0 ? (
        <div style={{ padding: "18px 16px 0" }}>
          <div className="empty">
            <b>Notes for this chapter are being written.</b>
            <Link href="/drill" className="btn sm"
              style={{ display: "inline-grid", placeItems: "center", marginTop: 12, textDecoration: "none" }}>
              Start a drill
            </Link>
          </div>
        </div>
      ) : (
        <div className="rows" style={{ paddingTop: 14 }}>
          {list.map((f) => {
            const done = isRead(f.id);
            return (
              <Link key={f.id} href={`/quickbits/${s.id}/${c.id}/${f.id}`}
                className={"row " + (done ? "done" : "")}>
                <span className="no">{f.no}</span>
                <span className="txt"><b>{f.title}</b><span>{done ? "read" : "not read"}</span></span>
                {done
                  ? <span className="badge">Read</span>
                  : <span className="mono" style={{ fontSize: 12 }}>→</span>}
              </Link>
            );
          })}
        </div>
      )}
      <div style={{ height: 24 }} />
    </>
  );
}
