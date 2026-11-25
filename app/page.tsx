import Link from "next/link";
import { profile, subjects } from "@/lib/content";

function Mark({ colour, d }: { colour: string; d: string }) {
  return (
    <span className="mk" style={{ background: colour }}>
      <svg viewBox="0 0 24 24" width="17" height="17" fill="#fff" stroke="none">
        <path d={d} />
      </svg>
    </span>
  );
}

export default function Learn() {
  return (
    <>
      <div className="hd">
        <div>
          <h1>Today</h1>
          <div className="mod" style={{ marginTop: 4 }}>
            {profile.daysToDse} days to DSE · {profile.coverage} of {profile.coverageTotal} topics
          </div>
        </div>
        <span className="streak">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d="M12 2.6c3.4 4 6.2 6.6 6.2 10.4a6.2 6.2 0 0 1-12.4 0c0-2.2 1.2-4 3-6.2.4 1.8 1.4 2.8 2.4 3.2-.4-2.6.2-5 .8-7.4z" />
          </svg>
          {profile.streak}
        </span>
      </div>

      <div className="sub" style={{ paddingBottom: 2 }}>Daily mix</div>
      <div style={{ padding: "0 16px 4px" }}>
        <div style={{
          background: "var(--ink)", color: "var(--paper)", border: "3px solid var(--ink)",
          borderRadius: 10, padding: "14px 16px", boxShadow: "5px 5px 0 var(--orange)",
        }}>
          <div className="mono" style={{ fontSize: 9.5, letterSpacing: 1, color: "var(--lime)" }}>
            {profile.dueToday} DUE TODAY
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, margin: "6px 0 10px" }}>
            Items you are about to forget
          </div>
          <Link href="/drill/identifiers" className="btn"
            style={{ display: "grid", placeItems: "center", minHeight: 44, textDecoration: "none" }}>
            Start
          </Link>
        </div>
      </div>

      <div className="sec"><h2>Drill</h2><span>6 chapters · 4 min each</span></div>
      <div className="cards">
        {subjects.slice(0, 3).map((s) => (
          <Link key={s.id} href="/drill" className="card">
            <Mark colour={s.colour} d={s.d} />
            <span className="txt">
              <b>{s.name}</b>
              <span>{s.id === "ict" ? "Chapter 6 · Weather and climate" : "Not started"}</span>
            </span>
            <span className="go">Start</span>
          </Link>
        ))}
      </div>

      <div className="sec"><h2>QuickBits</h2><span>one concept a screen</span></div>
      <div className="cards">
        {subjects.slice(0, 3).map((s) => (
          <Link key={s.id} href="/drill" className="card">
            <Mark colour={s.colour} d={s.d} />
            <span className="txt">
              <b>{s.name}</b>
              <span>{s.id === "ict" ? "14 notes read" : "0 notes read"}</span>
            </span>
            <span className="go">Study</span>
          </Link>
        ))}
      </div>
      <div style={{ height: 24 }} />
    </>
  );
}
