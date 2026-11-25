import Link from "next/link";
import { subjects, chapters } from "@/lib/content";
import { getReads, viewer } from "@/lib/repo";

export default async function QuickBits() {
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
        <div>
          <h1>QuickBits</h1>
          <div className="mod" style={{ marginTop: 4 }}>{read} of {total} notes read · one concept a screen</div>
        </div>
      </div>

      <div className="sec"><h2>Subjects</h2><span>study, don&apos;t drill</span></div>
      <div className="cards">
        {subjects.map((s) => (
          <Link key={s.id} href={`/quickbits/${s.id}`} className="card">
            <span className="mk" style={{ background: s.colour }}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="#fff"><path d={s.d} /></svg>
            </span>
            <span className="txt">
              <b>{s.name}</b>
              <span>
                {s.id === "ict"
                  ? `${chapters.length} chapters · ${read} read`
                  : "No notes yet"}
              </span>
            </span>
            <span className="go">{s.id === "ict" ? "Study" : "Soon"}</span>
          </Link>
        ))}
      </div>
      <div style={{ height: 24 }} />
    </>
  );
}
