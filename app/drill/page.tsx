import Link from "next/link";
import SubjectChips from "@/components/SubjectChips";
import { subjects } from "@/lib/content";
import { getModules, getPath, getStats, viewer } from "@/lib/repo";
import "./path.css";

type ModuleRow = {
  id: string; code: string; name: string; track: string;
  track_name: string; accent: string | null; lessons: number;
};

/* five seats, one question each — the party raid's own shape (PartyGate) */
const PARTY_SEATS = 5;

export default async function Path({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; t?: string }>;
}) {
  const v = await viewer();
  const { m, t } = await searchParams;

  if (!v) {
    return (
      <div className="v-path">
        <SubjectChips activeTrack="ict" />
        <div style={{ padding: "0 18px" }}>
          <div className="empty">
            <b>Sign in to drill</b>
            <p>Your path appears here once you are signed in.</p>
          </div>
        </div>
      </div>
    );
  }

  const [rows, stats] = await Promise.all([getModules(), getStats(v.id)]);
  const modules = rows as ModuleRow[];

  /* a subject chip (t) picks the first module on that track; a module chip (m) pins one */
  const picked = t ? modules.find((x) => x.track === t) : undefined;
  const requested = m ?? picked?.id;
  const path = await getPath(v.id, requested);
  const mod = path.module;

  if (t && !picked) {
    const subject = subjects.find((s) => s.id === t);
    return (
      <div className="v-path">
        <SubjectChips activeTrack={t} />
        <div style={{ padding: "18px" }}>
          <div className="empty">
            <b>{subject?.name ?? "This subject"} has no drills yet</b>
            <p>A teacher can publish lessons for it from the teaching portal. ICT is live now.</p>
            <Link href="/drill" className="btn" style={{ display: "grid", placeItems: "center",
              textDecoration: "none", marginTop: 14, maxWidth: 260, marginInline: "auto" }}>
              Back to ICT
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!mod) {
    return (
      <div className="v-path">
        <SubjectChips activeTrack="ict" />
        <div style={{ padding: "18px" }}>
          <div className="empty">
            <b>Nothing to drill yet</b>
            <p>No curriculum has been published yet.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="v-path">
      <SubjectChips activeTrack={mod.track} />

      <div className="hd">
        <span className="mod">{mod.track_name} · {mod.code}</span>
        <span className="mod dim">{path.done} of {path.total} done</span>
        <span className="streak">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
            <path d="M12 2c1 4 5 6 5 11a5 5 0 1 1-10 0c0-3 2-5 3-7 1 2 2 3 4 4 0-3-1-5-2-8z" />
          </svg>
          {stats.streak} in a row
        </span>
      </div>

      {path.lessons.length === 0 ? (
        <div style={{ padding: "18px" }}>
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
              /* only the first locked row names the lesson that opens it */
              const prev = idx > 0 ? path.lessons[idx - 1] : undefined;
              const hint = prev?.state === "now"
                ? `Locked · finish ${String(idx).padStart(2, "0")}`
                : "Locked";
              return (
                <div key={l.id} className="row lock">
                  <span className="no">{no}</span>
                  <span className="txt">
                    <b>{l.title}</b>
                    <span>{hint}</span>
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
                <span className="end" aria-hidden="true">{l.state === "done" ? "✓" : "→"}</span>
              </Link>
            );
          })}

          <Link href="/party" className="row boss">
            <span className="no">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 3.2l2.6 5.4 6 .9-4.3 4.2 1 6-5.3-2.9-5.3 2.9 1-6L3.4 9.5l6-.9z" />
              </svg>
            </span>
            <span className="txt">
              <b>Boss battle</b>
              <span>Party up · {PARTY_SEATS} items · 8 min</span>
            </span>
            <span className="end" aria-hidden="true">→</span>
          </Link>
        </div>
      )}
      <div style={{ height: 28 }} />
    </div>
  );
}
