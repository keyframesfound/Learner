import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createLessonAction } from "@/app/teach/content-actions";
import { isStaff, viewer } from "@/lib/repo";
import { allModules, lessonsOf } from "@/lib/teach";

type ModuleRow = {
  id: string;
  code: string;
  name: string;
  track_name: string;
  lessons: number;
};

const badgeFor = (status: string) =>
  "badge" + (status === "published" ? "" : " " + status);

export default async function ModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { module: moduleId } = await params;
  const { error } = await searchParams;

  const v = await viewer();
  if (!isStaff(v)) redirect("/login");

  const modules = (await allModules()) as ModuleRow[];
  const mod = modules.find((m) => m.id === moduleId);
  if (!mod) notFound();

  const lessons = await lessonsOf(moduleId);

  return (
    <>
      <div className="hd">
        <div>
          <h1>{mod.code}</h1>
          <div className="mod" style={{ marginTop: 4 }}>{mod.name}</div>
        </div>
        <span className="mod">{mod.track_name}</span>
      </div>

      <div className="sec">
        <h2>Lessons</h2>
        <span>{lessons.length} in this module</span>
      </div>

      {lessons.length === 0 ? (
        <div className="form-grid">
          <div className="empty">
            <b>No lessons yet</b>
            <p>
              Write the first lesson below. A lesson needs at least one question before students
              can drill it — notes alone cannot be graded.
            </p>
          </div>
        </div>
      ) : (
        <div className="table">
          {lessons.map((lesson) => (
            <Link
              key={lesson.id}
              href={"/teach/curriculum/" + mod.id + "/" + lesson.id}
              className="tr"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                <span style={{ fontWeight: 700 }}>{lesson.title}</span>
                <span className="hint">
                  {lesson.minutes} min · {lesson.blocks} {lesson.blocks === 1 ? "block" : "blocks"}
                </span>
              </span>
              <span className={badgeFor(lesson.status)}>{lesson.status}</span>
            </Link>
          ))}
        </div>
      )}

      {lessons.length > 0 && lessons.every((lesson) => lesson.blocks === 0) ? (
        <div className="form-grid" style={{ marginTop: 12 }}>
          <p className="hint" style={{ color: "var(--red-ink)", fontSize: 11 }}>
            Every lesson here is empty. Students cannot drill a lesson with no questions.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="form-grid" style={{ marginTop: 12 }}>
          <p className="hint" role="alert" style={{ color: "var(--red-ink)", fontSize: 11 }}>
            {error}
          </p>
        </div>
      ) : null}

      <div className="sec">
        <h2>New lesson</h2>
        <span>starts as a draft</span>
      </div>

      <form action={createLessonAction} className="form-grid">
        <input type="hidden" name="moduleId" value={mod.id} />

        <div className="field">
          <label className="label" htmlFor="new-lesson-title">Title</label>
          <input
            id="new-lesson-title"
            name="title"
            className="input"
            required
            minLength={3}
            maxLength={80}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="new-lesson-minutes">Minutes</label>
          <input
            id="new-lesson-minutes"
            name="minutes"
            type="number"
            className="input"
            min={2}
            max={8}
            defaultValue={4}
          />
          <span className="hint">2 to 8 minutes of drilling.</span>
        </div>

        <div className="field">
          <label className="label" htmlFor="new-lesson-summary">Summary</label>
          <textarea
            id="new-lesson-summary"
            name="summary"
            className="textarea"
            maxLength={200}
          />
        </div>

        <button className="btn">Create lesson</button>
      </form>

      <div style={{ height: 24 }} />
    </>
  );
}
