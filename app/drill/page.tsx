import Link from "next/link";
import SubjectChips, { type ChipModule } from "@/components/SubjectChips";
import { getModules, getPath, getStats, viewer } from "@/lib/repo";

type ModuleRow = ChipModule & { lessons: number };

export default async function Path({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const v = await viewer();
  if (!v) {
    return (
      <>
        <div className="hd"><h1>Drill</h1></div>
        <div style={{ padding: "0 16px" }}>
          <div className="empty">
            <b>Sign in to drill</b>
            <p>Your path appears here once you are signed in.</p>
          </div>
        </div>
      </>
    );
  }

  const { m } = await searchParams;
  const [rows, stats] = await Promise.all([getModules(), getStats(v.id)]);
  const modules = rows as ModuleRow[];
  const path = await getPath(v.id, m);
  const mod = path.module;

  if (!mod) {
    return (
      <>
        <div className="hd"><h1>Drill</h1></div>
        <div style={{ padding: "0 16px" }}>
          <div className="empty">
            <b>Nothing to drill yet</b>
            <p>No curriculum has been published yet.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SubjectChips modules={modules} activeId={mod.id} />

      <div className="hd">
        <div>
          <h1>{mod.code}</h1>
          <div className="mod" style={{ marginTop: 4 }}>{mod.name}</div>
        </div>
        <span className="mod dim">{path.done} of {path.total} done</span>
        <span className="streak">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d="M12 2.6c3.4 4 6.2 6.6 6.2 10.4a6.2 6.2 0 0 1-12.4 0c0-2.2 1.2-4 3-6.2.4 1.8 1.4 2.8 2.4 3.2-.4-2.6.2-5 .8-7.4z" />
          </svg>
          {stats.streak}
        </span>
      </div>

      {path.lessons.length === 0 ? (
        <div style={{ padding: "0 16px" }}>
          <div className="empty">
            <b>No lessons yet</b>
            <p>This curriculum has no lessons yet — a teacher can add them.</p>
          </div>
        </div>
      ) : (
        <div className="rows">
          {path.lessons.map((l, idx) => {
            const no = String(idx + 1).padStart(2, "0");
            const meta = `${l.items} ${l.items === 1 ? "item" : "items"} · ${l.minutes} min`;
            if (l.state === "lock") {
              const prev = idx > 0 ? String(idx).padStart(2, "0") : null;
              return (
                <div key={l.id} className="row lock">
                  <span className="no">{no}</span>
                  <span className="txt">
                    <b>{l.title}</b>
                    <span>{prev ? `Locked · finish ${prev}` : "Locked"}</span>
                  </span>
                </div>
              );
            }
            return (
              <Link key={l.id} href={`/drill/${l.slug}`} className={"row " + l.state}>
                <span className="no">{no}</span>
                <span className="txt">
                  <b>{l.title}</b>
                  <span>{meta}</span>
                </span>
                <span className="mono" style={{ fontSize: 13 }}>{l.state === "done" ? "✓" : "→"}</span>
              </Link>
            );
          })}

          <Link href="/party" className="row boss">
            <span className="no">★</span>
            <span className="txt"><b>Boss battle</b><span>Party up · 30s a question</span></span>
            <span className="mono" style={{ fontSize: 13 }}>→</span>
          </Link>
        </div>
      )}
      <div style={{ height: 24 }} />
    </>
  );
}
