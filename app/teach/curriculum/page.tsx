import Link from "next/link";
import { redirect } from "next/navigation";
import { isStaff, viewer } from "@/lib/repo";
import { allModules } from "@/lib/teach";

type ModuleRow = {
  id: string;
  code: string;
  name: string;
  track_name: string;
  lessons: number;
};

export default async function CurriculumPage() {
  const v = await viewer();
  if (!isStaff(v)) redirect("/login");

  const modules = (await allModules()) as ModuleRow[];

  return (
    <>
      <div className="hd">
        <div>
          <h1>Curriculum</h1>
          <div className="mod" style={{ marginTop: 4 }}>pick a module to write its lessons</div>
        </div>
        <span className="mod">{modules.length} modules</span>
      </div>

      <div className="sec">
        <h2>Modules</h2>
        <span>code · track · lessons</span>
      </div>

      {modules.length === 0 ? (
        <div className="form-grid">
          <div className="empty">
            <b>No modules yet</b>
            <p>Modules come from the seeded curriculum. Seed them before writing lessons.</p>
          </div>
        </div>
      ) : (
        <div className="table">
          {modules.map((m) => (
            <Link
              key={m.id}
              href={"/teach/curriculum/" + m.id}
              className="tr"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                <span style={{ fontWeight: 700 }}>{m.name}</span>
                <span className="hint">{m.track_name} · {m.code}</span>
              </span>
              <span className="badge">
                {m.lessons} {m.lessons === 1 ? "lesson" : "lessons"}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div style={{ height: 24 }} />
    </>
  );
}
