import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import JoinClass from "@/components/JoinClass";
import SignOut from "@/components/SignOut";
import { getModulesFor, getStats, isStaff, joinClass, myClass, viewer } from "@/lib/repo";

type JoinState = { error?: string; ok?: boolean; className?: string };

type ClassRow = {
  id: string;
  name: string;
  join_code: string;
  module_code: string | null;
  module_name: string | null;
};

type ModuleRow = {
  id: string;
  code: string;
  name: string;
  track_name: string;
  lessons: number;
};

async function joinClassAction(formData: FormData): Promise<JoinState> {
  "use server";
  const v = await viewer();
  if (!v) return { error: "Sign in to join a class." };

  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Enter the class code." };

  const res = await joinClass(v.id, code);
  if (!res.ok) return { error: res.error };

  revalidatePath("/me");
  return { ok: true, className: res.className };
}

export default async function Me() {
  const v = await viewer();
  if (!v) redirect("/login");

  const [stats, clsRaw, modulesRaw] = await Promise.all([
    getStats(v.id),
    myClass(v.id),
    getModulesFor(v),
  ]);

  const cls = clsRaw as ClassRow | null;
  const modules = modulesRaw as ModuleRow[];
  const sub = cls
    ? cls.module_code
      ? `${cls.name} · ${cls.module_code}`
      : cls.name
    : "F4 · ICT";

  const statsGrid = [
    ["Streak", `${stats.streak} ${stats.streak === 1 ? "day" : "days"}`],
    ["Items today", String(stats.itemsToday)],
    ["Coverage", `${stats.covered} of ${stats.coverageTotal} items`],
    ["To DSE", `${stats.daysToDse} ${stats.daysToDse === 1 ? "day" : "days"}`],
  ];

  return (
    <>
      <div className="hd">
        <div>
          <h1>{v.name}</h1>
          <div className="mod" style={{ marginTop: 4 }}>{sub}</div>
        </div>
      </div>

      {isStaff(v) && (
        <div style={{ padding: "16px 16px 0" }}>
          <Link href="/teach" className="card" style={{ textDecoration: "none" }}>
            <span className="mk" style={{ background: "var(--ink)", color: "var(--lime)" }}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M4 6h16M4 12h16M4 18h10" />
              </svg>
            </span>
            <span className="txt"><b>Teaching portal</b><span>Classes, curriculum, questions</span></span>
            <span className="go">Open</span>
          </Link>
        </div>
      )}

      <div className="sec"><h2>This week</h2><span>Honest numbers only</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 9, padding: "0 16px" }}>
        {statsGrid.map(([k, val]) => (
          <div key={k} style={{ border: "3px solid var(--ink)", borderRadius: 9, background: "#fff",
            padding: "11px 12px", boxShadow: "4px 4px 0 var(--line)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: "-.8px" }}>{val}</div>
            <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-3)", marginTop: 4 }}>{k}</div>
          </div>
        ))}
      </div>

      <div className="sec"><h2>Class</h2><span>{cls ? "your class" : "join with a code"}</span></div>
      {cls ? (
        <div className="rows">
          <div className="row" style={{ boxShadow: "3px 3px 0 var(--line)" }}>
            <span className="txt">
              <b>{cls.name}</b>
              <span>
                Join code <span className="mono">{cls.join_code}</span>
                {cls.module_name ? ` · ${cls.module_name}` : ""}
              </span>
            </span>
            <span className="mono" style={{ fontSize: 12 }}>{cls.module_code ?? ""}</span>
          </div>
        </div>
      ) : (
        <div className="form-grid">
          <JoinClass action={joinClassAction} />
        </div>
      )}

      <div className="sec"><h2>Modules</h2><span>{modules.length} in the course</span></div>
      <div className="rows">
        {modules.map((m, i) => (
          <div key={m.id} className="row" style={{ boxShadow: "3px 3px 0 var(--line)" }}>
            <span className="no">{String(i + 1).padStart(2, "0")}</span>
            <span className="txt">
              <b>{m.name}</b>
              <span>{m.track_name} · {m.lessons} {m.lessons === 1 ? "lesson" : "lessons"}</span>
            </span>
            <span className="mono" style={{ fontSize: 12 }}>{m.code}</span>
          </div>
        ))}
        {modules.length === 0 && (
          <div className="empty"><p>No modules yet.</p></div>
        )}
      </div>

      <div style={{ display: "grid", padding: "18px 16px 0" }}>
        <SignOut />
      </div>
      <div style={{ height: 24 }} />
    </>
  );
}
