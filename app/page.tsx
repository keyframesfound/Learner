import Link from "next/link";
import { subjects } from "@/lib/content";
import { enrolledModuleIds, getModulesFor, getPath, getStats, myClass, viewer } from "@/lib/repo";
import "./home.css";

type ModuleRow = {
  id: string;
  code: string;
  name: string;
  track: string;
  track_name: string;
  accent: string | null;
  lessons: number;
};

type ClassRow = {
  id: string;
  name: string;
  module_code: string | null;
  module_name: string | null;
};

type Progress = { done: number; total: number };

const FALLBACK_ACCENT = "#2D5BFF";

/** "Thursday evening" in the school's timezone. */
function greeting(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Hong_Kong",
    weekday: "long",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = Number(pick("hour"));
  const part = hour < 5 ? "night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  return `${pick("weekday")} ${part}`;
}

function colourFor(track: string, accent: string | null) {
  return subjects.find((s) => s.id === track)?.colour ?? accent ?? FALLBACK_ACCENT;
}

/** Lesson items answered correctly, against the items that exist. */
function itemProgress(path: { lessons: { items: number; done: number }[] }): Progress {
  let done = 0;
  let total = 0;
  for (const lesson of path.lessons) {
    done += lesson.done;
    total += lesson.items;
  }
  return { done, total };
}

function Glyph({ track, colour }: { track: string | null; colour: string }) {
  const style = { color: colour };
  if (track === "physics") {
    return (
      <svg className="vh-ico" viewBox="0 0 24 24" style={style} aria-hidden="true">
        <path className="s" d="M13.6 2.4 5.2 13.6h4.9L9.2 21.6 18.8 9.9h-5.3z" />
      </svg>
    );
  }
  if (track === "biology") {
    return (
      <svg className="vh-ico" viewBox="0 0 24 24" style={style} aria-hidden="true">
        <path className="s" d="M4.7 19.3C4.7 10.6 10.6 4.7 19.3 4.7c0 8.7-5.9 14.6-14.6 14.6Z" />
        <path className="o" d="M5.2 18.8 13.4 10.6" />
      </svg>
    );
  }
  if (track === "ict") {
    return (
      <svg className="vh-ico" viewBox="0 0 24 24" style={style} aria-hidden="true">
        <rect className="s" x="2.6" y="4" width="18.8" height="12.4" rx="1.6" />
        <rect className="s" x="10" y="16.4" width="4" height="2.4" />
        <rect className="s" x="6.6" y="18.8" width="10.8" height="2.2" rx="1" />
      </svg>
    );
  }
  return (
    <svg className="vh-ico" viewBox="0 0 24 24" style={style} aria-hidden="true">
      <circle className="s" cx="12" cy="12" r="5" />
    </svg>
  );
}

function ClsCard({
  href,
  track,
  colour,
  title,
  sub,
  progress,
}: {
  href: string;
  track: string | null;
  colour: string;
  title: string;
  sub?: string;
  progress: Progress;
}) {
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const width = `${Math.min(100, Math.max(0, pct))}%`;
  return (
    <Link href={href} className="vh-cls">
      <span className="vh-cls-top">
        <Glyph track={track} colour={colour} />
        <span className="vh-cls-name">{title}</span>
      </span>
      {sub ? <span className="vh-cls-sub">{sub}</span> : null}
      {progress.total > 0 ? (
        <span className="vh-cls-foot">
          <span className="vh-bar">
            <i style={{ width }} />
          </span>
          <span className="vh-pct">{pct}%</span>
        </span>
      ) : null}
    </Link>
  );
}

export default async function Learn() {
  const greet = greeting(new Date());
  const v = await viewer();

  if (!v) {
    return (
      <div className="v-home">
        <header className="vh-head">
          <div>
            <div className="vh-greet">{greet}</div>
            <h1 className="vh-name">Learner</h1>
          </div>
        </header>
      </div>
    );
  }

  const [stats, rows, clsRow, allowed] = await Promise.all([
    getStats(v.id),
    getModulesFor(v),
    myClass(v.id),
    v.role === "student" ? enrolledModuleIds(v.id) : Promise.resolve(undefined),
  ]);
  const modules = rows as ModuleRow[];
  const cls = clsRow as ClassRow | null;
  const paths = await Promise.all(modules.map((m) => getPath(v.id, m.id, allowed)));

  const byModule = new Map<string, (typeof paths)[number]>();
  for (const p of paths) if (p.module) byModule.set(p.module.id, p);

  const classModule = cls?.module_code
    ? modules.find((m) => m.code === cls.module_code) ?? null
    : null;
  const classPath = classModule ? byModule.get(classModule.id) : undefined;
  const classProgress = classPath ? itemProgress(classPath) : { done: 0, total: 0 };

  /* real curriculum pacing: minutes ÷ items, used to size "about n minutes" */
  let courseItems = 0;
  let courseMinutes = 0;
  for (const p of paths) {
    for (const lesson of p.lessons) {
      courseItems += lesson.items;
      courseMinutes += lesson.minutes;
    }
  }
  const pace = courseItems > 0 ? courseMinutes / courseItems : 0;
  const due = stats.dueToday;
  const estMinutes = due > 0 && pace > 0 ? Math.max(1, Math.round(due * pace)) : 0;

  const coverPct =
    stats.coverageTotal > 0 ? Math.round((stats.covered / stats.coverageTotal) * 100) : 0;

  const tracks = new Map<string, { name: string; progress: Progress }>();
  for (const p of paths) {
    if (!p.module) continue;
    const entry = tracks.get(p.module.track) ?? {
      name: p.module.track_name,
      progress: { done: 0, total: 0 },
    };
    const mine = itemProgress(p);
    entry.progress.done += mine.done;
    entry.progress.total += mine.total;
    tracks.set(p.module.track, entry);
  }
  const segments = [...tracks.entries()].filter(([, t]) => t.progress.total > 0);
  const revDone = segments.reduce((n, [, t]) => n + t.progress.done, 0);
  const revTotal = segments.reduce((n, [, t]) => n + t.progress.total, 0);

  return (
    <div className="v-home">
      <header className="vh-head">
        <div>
          <div className="vh-greet">{greet}</div>
          <h1 className="vh-name">{v.name}</h1>
        </div>
        <span className="vh-streak">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2c1 4 5 6 5 11a5 5 0 1 1-10 0c0-3 2-5 3-7 1 2 2 3 4 4 0-3-1-5-2-8z" />
          </svg>
          {stats.streak}
        </span>
      </header>

      <section className="vh-hero">
        <div className="vh-tag">Today</div>
        <h2>
          {due} {due === 1 ? "item" : "items"} due
          {estMinutes > 0 ? ` · about ${estMinutes} ${estMinutes === 1 ? "minute" : "minutes"}` : ""}
        </h2>
        <div
          className="vh-bar"
          role="progressbar"
          aria-valuenow={coverPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Items covered"
        >
          <i style={{ width: `${Math.min(100, Math.max(0, coverPct))}%` }} />
        </div>
        <div className="vh-hero-foot">
          <span className="vh-done">
            {stats.covered} of {stats.coverageTotal} done
          </span>
          <Link href="/drill" className="vh-start">
            Start
          </Link>
        </div>
      </section>

      {revTotal > 0 ? (
        <>
          <div className="vh-label">Revision</div>
          <div className="vh-rev">
            <div className="vh-rev-row">
              <span>
                Across {segments.length} {segments.length === 1 ? "subject" : "subjects"}
              </span>
              <span className="vh-rev-count">
                <b>{revDone}</b>
                <i>/{revTotal} items</i>
              </span>
            </div>
            <div className="vh-seg" aria-hidden="true">
              {segments.map(([id, t]) => {
                const pct =
                  t.progress.total > 0
                    ? Math.round((t.progress.done / t.progress.total) * 100)
                    : 0;
                return (
                  <span key={id}>
                    <i style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                  </span>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      <div className="vh-label">Classes</div>
      <div className="vh-cls-list">
      {cls ? (
        <ClsCard
          href={classModule ? `/drill?m=${encodeURIComponent(classModule.id)}` : "/drill"}
          track={classModule?.track ?? null}
          colour={classModule ? colourFor(classModule.track, classModule.accent) : FALLBACK_ACCENT}
          title={classModule ? `${cls.name} · ${classModule.track_name}` : cls.name}
          sub={cls.module_name ?? undefined}
          progress={classProgress}
        />
      ) : modules.length > 0 ? (
        modules.map((m) => {
          const p = byModule.get(m.id);
          return (
            <ClsCard
              key={m.id}
              href={`/drill?m=${encodeURIComponent(m.id)}`}
              track={m.track}
              colour={colourFor(m.track, m.accent)}
              title={m.name}
              sub={`${m.lessons} ${m.lessons === 1 ? "lesson" : "lessons"}`}
              progress={p ? itemProgress(p) : { done: 0, total: 0 }}
            />
          );
        })
      ) : (
        <div className="vh-empty">
          <b>No curriculum yet</b>
          <p>A teacher can publish the first module.</p>
        </div>
      )}
      </div>
    </div>
  );
}
