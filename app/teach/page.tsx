import Link from "next/link";
import { redirect } from "next/navigation";
import { viewer } from "@/lib/repo";
import { roster, teacherClasses } from "@/lib/teach";

type ClassRow = {
  id: string;
  name: string;
  students: number;
};

type RosterRow = { items_today: number };

export default async function TeachHome() {
  const v = await viewer();
  if (!v) redirect("/login");

  const classes: ClassRow[] = await teacherClasses(v);
  const rosters: RosterRow[][] = await Promise.all(classes.map((c) => roster(v, c.id)));

  const students = classes.reduce((n, c) => n + Number(c.students ?? 0), 0);
  const itemsToday = rosters.reduce(
    (n, rows) => n + rows.reduce((m, s) => m + Number(s.items_today ?? 0), 0),
    0,
  );

  return (
    <>
      <div className="hd">
        <div>
          <h1>Teaching</h1>
        </div>
      </div>
      <div className="sub">{v.name}</div>

      <div className="sec"><h2>Start here</h2><span>your two workspaces</span></div>
      <div className="cards">
        <Link href="/teach/classes" className="card">
          <span className="mk" style={{ background: "var(--lime)" }}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19V6a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z" />
              <path d="M9 8h6M9 12h4" />
            </svg>
          </span>
          <span className="txt">
            <b>Classes</b>
            <span>roster, join code, curriculum</span>
          </span>
          <span className="go">Open</span>
        </Link>
        <Link href="/teach/curriculum" className="card">
          <span className="mk" style={{ background: "var(--gold)" }}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 6.5C10.5 5 8.5 4.5 5 4.5v13c3.5 0 5.5.5 7 2 1.5-1.5 3.5-2 7-2v-13c-3.5 0-5.5.5-7 2z" />
              <path d="M12 6.5v12" />
            </svg>
          </span>
          <span className="txt">
            <b>Curriculum</b>
            <span>modules, lessons, items</span>
          </span>
          <span className="go">Open</span>
        </Link>
      </div>

      <div className="sec">
        <h2>Today</h2>
        <span>across {classes.length} {classes.length === 1 ? "class" : "classes"}</span>
      </div>
      <div className="cards">
        <div style={{ border: "3px solid var(--ink)", borderRadius: 9, background: "#fff", padding: "11px 12px", boxShadow: "4px 4px 0 var(--line)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: "-.8px" }}>{students}</div>
          <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-3)", marginTop: 4 }}>Students enrolled</div>
        </div>
        <div style={{ border: "3px solid var(--ink)", borderRadius: 9, background: "#fff", padding: "11px 12px", boxShadow: "4px 4px 0 var(--line)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: "-.8px" }}>{itemsToday}</div>
          <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-3)", marginTop: 4 }}>Items answered today</div>
        </div>
      </div>

      {classes.length === 0 && (
        <div className="table" style={{ paddingTop: 18 }}>
          <div className="empty">
            <b>No classes yet</b>
            <p>Create a class and today&apos;s numbers will show up here.</p>
          </div>
        </div>
      )}

      <div style={{ height: 24 }} />
    </>
  );
}
