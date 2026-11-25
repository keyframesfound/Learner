import { notFound, redirect } from "next/navigation";
import { viewer } from "@/lib/repo";
import { allModules, classFailures, roster, teacherClasses } from "@/lib/teach";
import { ConfirmDelete, CodeChip } from "@/components/teach/ClassForm";
import { deleteClassAction, setCurriculumAction } from "@/app/teach/class-actions";

type ClassRow = {
  id: string;
  name: string;
  join_code: string;
  module_id: string | null;
  module_code: string | null;
  module_name: string | null;
  students: number;
};

type ModuleRow = {
  id: string;
  code: string;
  name: string;
  track_name: string;
  lessons: number;
};

type StudentRow = {
  id: string;
  name: string;
  email: string;
  items_today: number;
  correct_n: number;
  graded_n: number;
  accuracy: number | null;
};

type FailureRow = {
  block_id: string;
  fail_pct: number | string | null;
  students_n: number;
  lesson: string;
  prompt: string;
};

export default async function ClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const v = await viewer();
  if (!v) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;
  const classes: ClassRow[] = await teacherClasses(v);
  const cls = classes.find((c) => c.id === id);
  if (!cls) notFound();

  const [modules, students, failures]: [ModuleRow[], StudentRow[], FailureRow[]] = await Promise.all([
    allModules(),
    roster(v, id),
    classFailures(v, id),
  ]);

  const graded = students.reduce((n, s) => n + Number(s.graded_n ?? 0), 0);
  const error = sp.error ?? null;

  return (
    <>
      <div className="hd">
        <div>
          <h1>{cls.name}</h1>
          <div className="mod" style={{ marginTop: 4 }}>
            {cls.module_code ? `${cls.module_code} · ${cls.module_name}` : "No curriculum yet"}
          </div>
        </div>
        <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
          <span className="label">Join code</span>
          <CodeChip code={cls.join_code} />
        </div>
      </div>

      {error ? (
        <div className="table" style={{ paddingTop: 10 }}>
          <p className="hint" style={{ color: "var(--red-ink)" }}>{error}</p>
        </div>
      ) : null}

      <div className="sec"><h2>Curriculum</h2><span>what this class drills</span></div>
      <div className="table">
        <form action={setCurriculumAction} style={{ display: "grid", gap: 12 }}>
          <input type="hidden" name="id" value={cls.id} />
          <div className="field">
            <label className="label" htmlFor="class-module">Module</label>
            <select id="class-module" className="select" name="moduleId" defaultValue={cls.module_id ?? ""}>
              <option value="">No curriculum yet</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} · {m.name} ({m.lessons} {m.lessons === 1 ? "lesson" : "lessons"})
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn sm">Save curriculum</button>
        </form>
      </div>

      <div className="sec"><h2>Roster</h2><span>{students.length} {students.length === 1 ? "student" : "students"}</span></div>

      {students.length === 0 ? (
        <div className="table">
          <div className="empty">
            <b>No students yet</b>
            <p>Share the join code above. Students join from their Me page.</p>
          </div>
        </div>
      ) : (
        <div className="table">
          <div className="tr" style={{ background: "transparent", border: 0, boxShadow: "none", padding: "0 2px" }}>
            <span className="label">Student</span>
            <span className="label" style={{ textAlign: "right" }}>Today · accuracy</span>
          </div>
          {students.map((s) => (
            <div className="tr" key={s.id}>
              <div style={{ minWidth: 0 }}>
                <b style={{ fontSize: 14 }}>{s.name}</b>
              </div>
              <span className="mono" style={{ fontSize: 10.5, fontWeight: 700 }}>
                {s.items_today} · {s.accuracy === null ? "—" : `${s.accuracy}%`}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="sec"><h2>Items this class gets wrong</h2><span>worst first</span></div>

      {graded === 0 ? (
        <div className="table">
          <div className="empty">
            <b>No attempts yet</b>
            <p>Once this class starts answering, the items they miss show up here.</p>
          </div>
        </div>
      ) : failures.length === 0 ? (
        <div className="table">
          <div className="empty">
            <b>Nothing to review</b>
            <p>No wrong answers recorded for this class yet.</p>
          </div>
        </div>
      ) : (
        <div className="rows">
          {failures.map((f) => (
            <div className="row" key={f.block_id} style={{ boxShadow: "3px 3px 0 var(--line)" }}>
              <span className="txt">
                <b style={{ whiteSpace: "normal" }}>{f.prompt}</b>
                <span>{f.lesson} · {f.students_n} {f.students_n === 1 ? "student" : "students"}</span>
              </span>
              <span className="mono" style={{ fontWeight: 700 }}>
                {f.fail_pct === null ? "—" : `${Math.round(Number(f.fail_pct))}%`}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="sec"><h2>Danger zone</h2><span>can&apos;t be undone</span></div>
      <div className="table" style={{ maxWidth: 460 }}>
        <p className="hint">Deleting the class unenrolls every student and retires the join code.</p>
        <ConfirmDelete id={cls.id} action={deleteClassAction} />
      </div>

      <div style={{ height: 24 }} />
    </>
  );
}
