import Link from "next/link";
import { subjects } from "@/lib/content";

/* The notes surface, ready and reachable, deliberately empty: chapters get a page
   when they are authored, and until then this screen says so instead of listing
   placeholder notes that nobody can read. */
export default function QuickBits() {
  return (
    <>
      <div className="hd">
        <div>
          <h1>QuickBits</h1>
          <div className="mod" style={{ marginTop: 4 }}>One concept a screen · notes are being written</div>
        </div>
      </div>

      <div style={{ padding: "18px 16px 0" }}>
        <div className="empty">
          <b>No notes yet.</b>
          <p style={{ marginTop: 6 }}>
            The first chapter is not written. Drills are live — start there.
          </p>
          <Link href="/drill" className="btn sm"
            style={{ display: "inline-grid", placeItems: "center", marginTop: 12, textDecoration: "none" }}>
            Start a drill
          </Link>
        </div>
      </div>

      <div className="sec" style={{ marginTop: 8 }}><h2>Subjects</h2><span>Study, don&apos;t drill</span></div>
      <div className="cards">
        {subjects.map((s) => (
          <div key={s.id} className="card">
            <span className="mk" style={{ background: s.colour }}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="#fff"><path d={s.d} /></svg>
            </span>
            <span className="txt">
              <b>{s.name}</b>
              <span>No notes yet</span>
            </span>
            <span className="go">Soon</span>
          </div>
        ))}
      </div>
      <div style={{ height: 24 }} />
    </>
  );
}
