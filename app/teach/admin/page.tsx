import { redirect } from "next/navigation";
import { isStaff, viewer } from "@/lib/repo";
import { staffRows } from "@/lib/teach";
import { adminModules, schoolCounts } from "@/app/teach/data";
import NewTeacherField from "@/components/teach/NewTeacherField";
import StaffRemove from "@/components/teach/StaffRemove";

export default async function AdminPage() {
  const v = await viewer();
  if (!isStaff(v)) redirect("/login");

  const [modules, staff, counts] = await Promise.all([
    adminModules(),
    staffRows(),
    schoolCounts(),
  ]);

  const isAdmin = v?.role === "admin";
  const SOURCE = { env: "Server config", table: "Added here", account: "Account" } as const;

  return (
    <section className="screen on" id="admin">
      <div className="body">
        <h1>Admin</h1>
        <div className="sub">
          Single school install · {staff.length} {staff.length === 1 ? "teacher" : "teachers"} ·{" "}
          {counts.modules} {counts.modules === 1 ? "curriculum" : "curricula"} ·{" "}
          {counts.classes} {counts.classes === 1 ? "class" : "classes"} ·{" "}
          {counts.students} {counts.students === 1 ? "student" : "students"}
        </div>

        <div className="qfoot" style={{ padding: "18px 4px 8px" }}>
          <span>Curricula</span>
          <span>Owned by one teacher · shared by any number of classes</span>
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
          <span>Staff open the portal · an admin can also add admins</span>
        </div>

        <NewTeacherField canAddAdmin={isAdmin} />

        <div className="bt">
          <div className="r h" style={{ gridTemplateColumns: "1.2fr 1.6fr 100px 130px 90px 44px" }}>
            <div>Name</div><div>Email</div><div>Role</div><div>Source</div><div>Curricula</div><div />
          </div>

          {staff.length === 0 ? (
            <div style={{ padding: "18px 14px", background: "#fff", fontSize: 12.5, color: "var(--ink-3)" }}>
              No teachers yet.
            </div>
          ) : null}

          {staff.map((person) => {
            const locked = person.source === "env" || person.email === v?.email?.toLowerCase();
            const hidden = person.role === "admin" && !isAdmin;
            return (
              <div key={person.email} className="r" style={{ gridTemplateColumns: "1.2fr 1.6fr 100px 130px 90px 44px" }}>
                <div className="nm">{person.name ?? "Invited"}</div>
                <div className="mono dim2">{person.email}</div>
                <div className="lvl">{person.role === "admin" ? "Admin" : "Teacher"}</div>
                <div className="mono dim3">{SOURCE[person.source]}</div>
                <div className="mono">{person.curricula > 0 ? person.curricula : "—"}</div>
                {locked || hidden ? <div /> : <StaffRemove email={person.email} />}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
