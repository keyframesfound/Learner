import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isStaff, viewer } from "@/lib/repo";
import { teacherClasses } from "@/lib/teach";
import { ageShort, isStale, rosterDetail, shortDate } from "@/app/teach/data";
import { deleteClassAction, removeStudentAction, renameClassAction } from "@/app/teach/class-actions";
import ConfirmSubmit from "@/components/teach/ConfirmSubmit";
import JoinCode from "@/components/teach/JoinCode";

type ClassRow = {
  id: string;
  name: string;
  join_code: string;
  module_id: string | null;
  module_code: string | null;
  module_name: string | null;
  students: number;
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
  if (!isStaff(v)) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;

  const classes = (await teacherClasses(v)) as ClassRow[];
  const cls = classes.find((c) => c.id === id);
  if (!cls) notFound();

  const students = await rosterDetail(id);

  return (
    <section className="screen on" id="class">
      <div className="topstrip">
        <Link className="back" href="/teach/classes">← Classes</Link>
        <span className="div" />
        <span className="autosave">
          {students.length} {students.length === 1 ? "student" : "students"} · join code {cls.join_code}
        </span>
        <span className="spacer" />

        <form action={renameClassAction} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="hidden" name="id" value={cls.id} />
          <input
            className="fld"
            name="name"
            defaultValue={cls.name}
            maxLength={40}
            required
            aria-label="Class name"
            style={{ height: 34, width: 160 }}
          />
          <button type="submit" className="b sm">Save</button>
        </form>

        <ConfirmSubmit
          action={deleteClassAction}
          hidden={{ id: cls.id }}
          label="Delete class"
          message="Delete this class? Students are unenrolled and the join code stops working."
        />
      </div>

      <div className="body">
        {sp.error ? (
          <p role="alert" style={{ color: "var(--red-ink)", fontSize: 11, marginBottom: 10 }}>{sp.error}</p>
        ) : null}

        <div className="chead" style={{ marginBottom: 12 }}>
          <div>
            <h1>{cls.name}</h1>
            <div className="sub" style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 9 }}>
              {cls.module_name
                ? <span className="cchip">{cls.module_name}</span>
                : <span className="lvl">No curriculum</span>}
              {cls.module_id ? (
                <Link className="rm" href={`/teach/curriculum?c=${encodeURIComponent(cls.module_id)}`}>
                  Open curriculum →
                </Link>
              ) : null}
            </div>
          </div>
          <span className="spacer" />
          <JoinCode code={cls.join_code} />
        </div>

        <div className="bt">
          <div className="r h" style={{ gridTemplateColumns: "minmax(200px,1.6fr) 110px 130px 130px 80px" }}>
            <div>Student</div><div>Joined</div><div>Answered</div><div>Last active</div><div />
          </div>

          {students.length === 0 ? (
            <div style={{ padding: "18px 14px", background: "#fff", fontSize: 12.5, color: "var(--ink-3)" }}>
              No students have joined yet. Share the join code above.
            </div>
          ) : null}

          {students.map((student) => (
            <div
              key={student.id}
              className="r"
              style={{ gridTemplateColumns: "minmax(200px,1.6fr) 110px 130px 130px 80px" }}
            >
              <div className="nm">{student.name}</div>
              <div className="mono dim2">{shortDate(student.joined_at)}</div>
              <div className="mono">{student.answered} items</div>
              <div className={"mono " + (student.last_at === null ? "dim3" : isStale(student.last_at) ? "hot" : "dim2")}>
                {ageShort(student.last_at)}
              </div>
              <div>
                <ConfirmSubmit
                  action={removeStudentAction}
                  hidden={{ id: cls.id, studentId: student.id }}
                  label="Remove"
                  message={`Remove ${student.name} from this class?`}
                  className="rm"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="qfoot">
          <span>{students.length} {students.length === 1 ? "student" : "students"} joined</span>
        </div>
      </div>
    </section>
  );
}
