import Link from "next/link";
import { subjects, chapters } from "@/lib/content";

const read = chapters.reduce((n, c) => n + c.read, 0);
const total = chapters.reduce((n, c) => n + c.fragments, 0);

export default function QuickBits() {
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
        {subjects.map((s, i) => (
          <Link key={s.id} href={i === 0 ? "/quickbits/ict" : "/quickbits/ict"} className="card">
            <span className="mk" style={{ background: s.colour }}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="#fff"><path d={s.d} /></svg>
            </span>
            <span className="txt">
              <b>{s.name}</b>
              <span>{i === 0 ? `${chapters.length} chapters · ${read} read` : "No chapters yet"}</span>
            </span>
            <span className="go">{i === 0 ? "Study" : "Soon"}</span>
          </Link>
        ))}
      </div>
      <div style={{ height: 24 }} />
    </>
  );
}
