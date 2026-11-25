import { redirect } from "next/navigation";
import { isStaff, viewer } from "@/lib/repo";
import { adminModules, schoolCounts, teacherRows } from "@/app/teach/data";

export default async function AdminPage() {
  const v = await viewer();
  if (!isStaff(v)) redirect("/login");

  const [modules, teachers, counts] = await Promise.all([
    adminModules(),
    teacherRows(),
    schoolCounts(),
  ]);

  return (
    <section className="screen on" id="admin">
      <div className="body">
        <h1>Admin</h1>
        <div className="sub">
          Single school install · {counts.teachers} {counts.teachers === 1 ? "teacher" : "teachers"} ·{" "}
          {counts.modules} {counts.modules === 1 ? "curriculum" : "curricula"} ·{" "}
          {counts.classes} {counts.classes === 1 ? "class" : "classes"} ·{" "}
          {counts.students} {counts.students === 1 ? "student" : "students"}
        </div>

        <div className="qfoot" style={{ padding: "18px 4px 8px" }}>
          <span>Curricula</span>
          <span>owned by one teacher · shared by any number of classes</span>
        </div>
        <div className="bt">
          <div className="r h" style={{ gridTemplateColumns: "1.2fr 1fr 100px 100px 110px" }}>
            <div>Curriculum</div><div>Owner</div><div>Classes</div><div>Chapters</div><div>State</div>
          </div>

          {modules.length === 0 ? (
            <div style={{ padding: "18px 14px", background: "#fff", fontSize: 12.5, color: "var(--ink-3)" }}>
              No curricula yet.
            </div>
          ) : null}

          {modules.map((module) => (
            <div key={module.id} className="r" style={{ gridTemplateColumns: "1.2fr 1fr 100px 100px 110px" }}>
              <div className="nm">{module.name}</div>
              <div className={"mono " + (module.owner ? "dim2" : "dim3")}>{module.owner ?? "—"}</div>
              <div className="mono">{module.classes}</div>
              <div className="mono">{module.lessons}</div>
              <div className="lvl">{Number(module.published) > 0 ? "Published" : "Draft"}</div>
            </div>
          ))}
        </div>

        <div className="qfoot" style={{ padding: "18px 4px 8px" }}>
          <span>Teachers</span>
          <span>a teacher owns the curricula their classes sit</span>
        </div>
        <div className="bt">
          <div className="r h" style={{ gridTemplateColumns: "1.2fr 1.8fr 120px 110px" }}>
            <div>Name</div><div>Email</div><div>Role</div><div>Curricula</div>
          </div>

          {teachers.length === 0 ? (
            <div style={{ padding: "18px 14px", background: "#fff", fontSize: 12.5, color: "var(--ink-3)" }}>
              No teachers yet.
            </div>
          ) : null}

          {teachers.map((teacher) => (
            <div key={teacher.id} className="r" style={{ gridTemplateColumns: "1.2fr 1.8fr 120px 110px" }}>
              <div className="nm">{teacher.name}</div>
              <div className="mono dim2">{teacher.email}</div>
              <div className="lvl">{teacher.role === "admin" ? "Admin" : "Teacher"}</div>
              <div className="mono">{teacher.curricula > 0 ? teacher.curricula : "—"}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
