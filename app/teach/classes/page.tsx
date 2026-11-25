import Link from "next/link";
import { redirect } from "next/navigation";
import { viewer } from "@/lib/repo";
import { allModules, teacherClasses } from "@/lib/teach";
import { ClassForm } from "@/components/teach/ClassForm";

type ClassRow = {
  id: string;
  name: string;
  join_code: string;
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

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; new?: string }>;
}) {
  const v = await viewer();
  if (!v) redirect("/login");

  const sp = await searchParams;
  const classes: ClassRow[] = await teacherClasses(v);
  const modules: ModuleRow[] = await allModules();
  const showForm = sp.new === "1";
  const error = sp.error ?? null;

  return (
    <>
      <div className="hd">
        <div>
          <h1>Classes</h1>
        </div>
        {showForm ? (
          <Link className="btn sm ghost" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }} href="/teach/classes">Cancel</Link>
        ) : (
          <Link className="btn sm ghost" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }} href="/teach/classes?new=1">New class</Link>
        )}
      </div>

      {error && !showForm ? (
        <div className="table" style={{ paddingTop: 10 }}>
          <p className="hint" style={{ color: "var(--red-ink)" }}>{error}</p>
        </div>
      ) : null}

      {showForm && (
        <>
          <div className="sec"><h2>New class</h2><span>share the code after</span></div>
          <div className="table">
            <ClassForm modules={modules} error={error} />
          </div>
        </>
      )}

      <div className="sec"><h2>Your classes</h2><span>{classes.length} total</span></div>

      {classes.length === 0 ? (
        <div className="table">
          <div className="empty">
            <b>No classes yet</b>
            <p>
              Create a class, then share its 6-character join code. Students join from their Me page.
            </p>
          </div>
        </div>
      ) : (
        <div className="table">
          {classes.map((c) => (
            <div className="tr" key={c.id}>
              <div style={{ minWidth: 0 }}>
                <Link href={`/teach/classes/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <b style={{ fontSize: 14.5 }}>{c.name}</b>
                </Link>
                <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-3)", marginTop: 3 }}>
                  {c.join_code} · {c.module_code ? `${c.module_code} ${c.module_name}` : "No curriculum yet"}
                </div>
              </div>
              <span className="mono" style={{ fontSize: 10.5, fontWeight: 700 }}>
                {c.students} {c.students === 1 ? "student" : "students"}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 24 }} />
    </>
  );
}
