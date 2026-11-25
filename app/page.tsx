import Link from "next/link";
import { subjects } from "@/lib/content";
import { getModules, getPath, getStats, viewer } from "@/lib/repo";

type ModuleRow = {
  id: string;
  code: string;
  name: string;
  track: string;
  track_name: string;
  accent: string | null;
  lessons: number;
};

const FALLBACK_ACCENT = "#2D5BFF";

function Mark({ colour, d }: { colour: string; d?: string }) {
  return (
    <span className="mk" style={{ background: colour }}>
      <svg viewBox="0 0 24 24" width="17" height="17" fill="#fff" stroke="none">
        {d ? <path d={d} /> : <circle cx="12" cy="12" r="4" />}
      </svg>
    </span>
  );
}

export default async function Learn() {
  const v = await viewer();
  if (!v) {
    return (
      <>
        <div className="hd">
          <h1>Today</h1>
        </div>
        <div style={{ padding: "0 16px" }}>
          <div className="empty">
            <b>Sign in to see today</b>
            <p>Your daily mix, streak and progress appear here.</p>
          </div>
        </div>
      </>
    );
  }

  const [stats, rows] = await Promise.all([getStats(v.id), getModules()]);
  const modules = rows as ModuleRow[];
  const paths = await Promise.all(modules.map((m) => getPath(v.id, m.id)));
  const progress = new Map(
    paths.map((p) => [p.module?.id ?? "", { done: p.done, total: p.total }]),
  );
  const nextLesson = paths.flatMap((p) => p.lessons).find((l) => l.state === "now") ?? null;
  const startHref = nextLesson ? `/drill/${nextLesson.slug}` : "/drill";

  return (
    <>
      <div className="hd">
        <div>
          <h1>Today</h1>
        </div>
        <span className="streak">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d="M12 2.6c3.4 4 6.2 6.6 6.2 10.4a6.2 6.2 0 0 1-12.4 0c0-2.2 1.2-4 3-6.2.4 1.8 1.4 2.8 2.4 3.2-.4-2.6.2-5 .8-7.4z" />
          </svg>
          {stats.streak}
        </span>
      </div>
      <div style={{ padding: "0 16px 4px" }}>
        <div style={{
          background: "var(--ink)", color: "var(--paper)", border: "3px solid var(--ink)",
          borderRadius: 10, padding: "14px 16px 18px", boxShadow: "5px 5px 0 var(--orange)",
        }}>
          <div className="mono" style={{ fontSize: 9.5, letterSpacing: 1, color: "var(--lime)" }}>
            {stats.dueToday > 0 ? `${stats.dueToday} DUE TODAY` : nextLesson ? "NOTHING DUE" : "PATH COMPLETE"}
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, margin: "6px 0 10px" }}>
            {stats.dueToday > 0
              ? `${stats.dueToday} ${stats.dueToday === 1 ? "item is" : "items are"} about to slip`
              : nextLesson
                ? "Nothing due. Start the next lesson."
                : "You are done for today"}
          </div>
          {(stats.dueToday > 0 || nextLesson) && (
            <Link href={startHref} className="btn"
              style={{ display: "grid", placeItems: "center", minHeight: 44, padding: "0 22px",
            width: "fit-content", minWidth: 132, textDecoration: "none" }}>
              Start
            </Link>
          )}
        </div>
      </div>
      <div className="sec"><h2>Drill</h2></div>
      {modules.length === 0 ? (
        <div style={{ padding: "0 16px" }}>
          <div className="empty">
            <b>No curriculum yet</b>
            <p>A teacher can publish the first module.</p>
          </div>
        </div>
      ) : (
        <div className="cards">
          {modules.map((m) => {
            const icon = subjects.find((s) => s.id === m.track);
            const p = progress.get(m.id);
            const done = p?.done ?? 0;
            const total = p?.total ?? m.lessons;
            return (
              <Link key={m.id} href={`/drill?m=${encodeURIComponent(m.id)}`} className="card">
                <Mark colour={icon?.colour ?? m.accent ?? FALLBACK_ACCENT} d={icon?.d} />
                <span className="txt">
                  <b>{m.name}</b>
                  <span>{done} of {total} lessons</span>
                </span>
                <span className="go">{total > 0 && done >= total ? "Review" : "Start"}</span>
              </Link>
            );
          })}
        </div>
      )}
      <div className="sec"><h2>QuickBits</h2></div>
      <div className="cards">
        {subjects.slice(0, 3).map((s) => (
          <Link key={s.id} href="/quickbits" className="card">
            <Mark colour={s.colour} d={s.d} />
            <span className="txt">
              <b>{s.name}</b>
              <span>one concept a screen</span>
            </span>
            <span className="go">Study</span>
          </Link>
        ))}
      </div>
      <div style={{ height: 24 }} />
    </>
  );
}
