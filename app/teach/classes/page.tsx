import Link from "next/link";
import { redirect } from "next/navigation";
import { isStaff, viewer } from "@/lib/repo";
import { teacherClasses } from "@/lib/teach";
import { ageShort, classLastActive, isStale, moduleList } from "@/app/teach/data";
import ClassForm from "@/components/teach/ClassForm";

type ClassRow = {
  id: string;
  name: string;
  join_code: string;
  module_id: string | null;
  module_code: string | null;
  module_name: string | null;
  students: number;
};

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const v = await viewer();
  if (!v) redirect("/login");
  if (!isStaff(v)) redirect("/login");
  const sp = await searchParams;

  const [classes, modules] = await Promise.all([
    teacherClasses(v) as Promise<ClassRow[]>,
    moduleList(),
  ]);

  const lastActive = await classLastActive(classes.map((c) => c.id));
  const students = classes.reduce((n, c) => n + Number(c.students ?? 0), 0);
  const shared = modules.filter((m) => m.classes > 1);

  return (
    <section className="screen on" id="classes">
      <div className="topstrip">
        <span className="autosave">
          {classes.length} {classes.length === 1 ? "class" : "classes"} · {students} {students === 1 ? "student" : "students"}
        </span>
        <span className="spacer" />
      </div>

      <div className="body">
        <h1>Classes</h1>
        <div className="sub">A class is a group of students · the curriculum is chosen when you create it</div>

        <div className="cwrap" style={{ marginTop: 16 }}>
          <div>
            <div className="bt">
              <div className="r h" style={{ gridTemplateColumns: "90px 1.4fr 110px 130px 130px 40px" }}>
                <div>Class</div><div>Curriculum</div><div>Students</div><div>Join code</div><div>Last active</div><div />
              </div>

              {classes.length === 0 ? (
                <div style={{ padding: "18px 14px", background: "#fff", fontSize: 12.5, color: "var(--ink-3)" }}>
                  No classes yet. Create one on the right and share its join code.
                </div>
              ) : null}

              {classes.map((cls) => {
                const last = lastActive.get(cls.id) ?? null;
                return (
                  <Link
                    key={cls.id}
                    className="r crow"
                    style={{ gridTemplateColumns: "90px 1.4fr 110px 130px 130px 40px" }}
                    href={`/teach/classes/${cls.id}`}
                  >
                    <div className="nm">{cls.name}</div>
                    <div>
                      {cls.module_name
                        ? <span className="cchip">{cls.module_name}</span>
                        : <span className="lvl">No curriculum</span>}
                    </div>
                    <div className="mono">{Number(cls.students ?? 0)}</div>
                    <div className="mono">{cls.join_code}</div>
                    <div className={"mono " + (last === null ? "dim3" : isStale(last) ? "hot" : "dim2")}>
                      {ageShort(last)}
                    </div>
                    <div className="arrow">→</div>
                  </Link>
                );
              })}
            </div>

            <div className="qfoot">
              <span>
                {shared.length > 0
                  ? shared.map((m) => `${m.name} is shared by ${m.classes} classes`).join(" · ")
                  : "Each class follows its own curriculum"}
              </span>
            </div>

            <div className="note" style={{ marginTop: 14, maxWidth: 620, fontSize: 11.5, lineHeight: 1.6, color: "var(--ink-3)" }}>
              A class holds students. A curriculum holds notes and questions. Changing a curriculum changes
              every class sitting it, so a mid-term edit is a decision about all of them at once.
            </div>
          </div>

          <ClassForm modules={modules} error={sp.error ?? null} />
        </div>
      </div>
    </section>
  );
}
