import Link from "next/link";
import { lessons, subjects } from "@/lib/content";

export default function Path() {
  return (
    <>
      <div className="subs">
        {subjects.map((s, i) => (
          <Link key={s.id} href={i === 0 ? "/drill" : "/drill"} className={"chip" + (i === 0 ? " on" : "")}
            style={{ ["--c" as string]: s.colour }}>
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d={s.d} /></svg>
            {s.name}
          </Link>
        ))}
      </div>

      <div className="hd">
        <span className="mod">ICT · E2C</span>
        <span className="mod dim">2 of 5 done</span>
        <span className="streak">12 in a row</span>
      </div>

      <div className="rows">
        {lessons.map((l) => (
          <Link key={l.id} href={l.state === "lock" ? "/drill" : `/drill/${l.id}`}
            className={"row " + l.state}
            style={l.state === "lock" ? { pointerEvents: "none" } : undefined}>
            <span className="no">{l.no}</span>
            <span className="txt"><b>{l.title}</b><span>{l.meta}</span></span>
            <span className="mono" style={{ fontSize: 13 }}>{l.state === "done" ? "✓" : l.state === "now" ? "→" : ""}</span>
          </Link>
        ))}

        <Link href="/party" className="row boss">
          <span className="no">★</span>
          <span className="txt"><b>Boss battle</b><span>Party up · 5 players · 30s a question</span></span>
          <span className="mono" style={{ fontSize: 13 }}>→</span>
        </Link>
      </div>
      <div style={{ height: 24 }} />
    </>
  );
}
