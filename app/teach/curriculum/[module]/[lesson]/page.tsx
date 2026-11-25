import { notFound, redirect } from "next/navigation";
import { deleteBlockAction, moveBlockAction } from "@/app/teach/content-actions";
import BlockEditor, { type BlockOption } from "@/components/teach/BlockEditor";
import LessonForm from "@/components/teach/LessonForm";
import { isStaff, viewer, type Viewer } from "@/lib/repo";
import { blocksOf, lessonById, ownLesson } from "@/lib/teach";

type LessonEditorRow = {
  id: string;
  module_id: string;
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  status: "draft" | "published" | "archived";
  ord: number;
  module_name: string;
};

const LETTERS = "ABCDE";

const letter = (i: number) => LETTERS[i] ?? "?";

const badgeFor = (status: string) =>
  "badge" + (status === "published" ? "" : " " + status);

function proseOf(payload: Record<string, unknown>) {
  return typeof payload.md === "string" ? payload.md : "";
}

function mcqOf(payload: Record<string, unknown>) {
  const prompt = typeof payload.prompt === "string" ? payload.prompt : "";
  const code = Array.isArray(payload.code)
    ? payload.code.filter((line): line is string => typeof line === "string")
    : [];

  const options: BlockOption[] = Array.isArray(payload.options)
    ? payload.options.flatMap((item): BlockOption[] => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        const label = typeof row.text === "string" ? row.text : "";
        if (!label) return [];
        return [row.code === true ? { text: label, code: true } : { text: label }];
      })
    : [];

  const rawAnswer = typeof payload.answer === "number" ? payload.answer : 0;
  const answer = options.length ? Math.min(Math.max(rawAnswer, 0), options.length - 1) : -1;
  const why = typeof payload.why === "string" ? payload.why : "";
  const wrongWhy = typeof payload.wrongWhy === "string" ? payload.wrongWhy : "";

  return { prompt, code, options, answer, why, wrongWhy };
}

export default async function LessonEditorPage({
  params,
}: {
  params: Promise<{ module: string; lesson: string }>;
}) {
  const { module: moduleId, lesson: lessonId } = await params;

  const v = await viewer();
  if (!isStaff(v)) redirect("/login");
  const staff = v as Viewer;

  const lesson = (await lessonById(lessonId)) as LessonEditorRow | null;
  if (!lesson || lesson.module_id !== moduleId) notFound();
  if (!(await ownLesson(staff, lessonId))) notFound();

  const blocks = await blocksOf(lessonId);
  const mcqCount = blocks.filter((block) => block.kind === "mcq").length;

  return (
    <>
      <div className="hd">
        <div style={{ minWidth: 0 }}>
          <h1>{lesson.title}</h1>
          <div className="mod" style={{ marginTop: 4 }}>{lesson.module_name} · {lesson.slug}</div>
        </div>
        <span className={badgeFor(lesson.status)}>{lesson.status}</span>
      </div>

      <div className="sec">
        <h2>Lesson settings</h2>
        <span>{lesson.minutes} min</span>
      </div>

      <LessonForm
        lessonId={lesson.id}
        title={lesson.title}
        summary={lesson.summary}
        minutes={lesson.minutes}
        status={lesson.status}
      />

      {blocks.length === 0 || mcqCount === 0 ? (
        <div className="form-grid" style={{ marginTop: 14 }}>
          <p className="hint" style={{ color: "var(--red-ink)", fontSize: 11 }}>
            {blocks.length === 0
              ? "No blocks yet. Students cannot drill this lesson until you add at least one question."
              : "No questions yet. The notes are readable, but the drill player has nothing to grade."}
          </p>
        </div>
      ) : null}

      <div className="sec">
        <h2>Blocks</h2>
        <span>{blocks.length} total · {mcqCount} questions</span>
      </div>

      {blocks.length === 0 ? (
        <div className="form-grid">
          <div className="empty">
            <b>Nothing to read or drill</b>
            <p>Add a note to explain the idea, then a question so students can practise it.</p>
          </div>
        </div>
      ) : (
        <div className="table">
          {blocks.map((block, index) => {
            const mcq = block.kind === "mcq" ? mcqOf(block.payload) : null;

            return (
              <div
                key={block.id}
                className="tr"
                style={{ gridTemplateColumns: "1fr", alignItems: "start" }}
              >
                <div style={{ display: "grid", gap: 9, minWidth: 0 }}>
                  <div className="row-line" style={{ justifyContent: "space-between" }}>
                    <span className="badge">{block.kind === "mcq" ? "Question" : "Note"}</span>
                    <span className="hint">#{index + 1}</span>
                  </div>

                  {mcq ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.45 }}>
                        {mcq.prompt || "Untitled question"}
                      </p>

                      {mcq.code.length > 0 ? (
                        <div className="code" style={{ margin: 0 }}>
                          {mcq.code.map((line, k) => (
                            <span key={k}>
                              <span className="ln">{k + 1}</span>{line}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div style={{ display: "grid", gap: 6 }}>
                        {mcq.options.map((option, k) => (
                          <div
                            key={k}
                            className={"opt" + (k === mcq.answer ? " good" : "")}
                            style={{
                              boxShadow: "none",
                              padding: "7px 9px",
                              fontSize: 13,
                              cursor: "default",
                            }}
                          >
                            <span className="letter">{letter(k)}</span>
                            <span style={{ fontFamily: option.code ? "var(--font-mono)" : undefined }}>
                              {option.text}
                            </span>
                            {k === mcq.answer ? (
                              <span className="badge" style={{ marginLeft: "auto" }}>answer</span>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      {mcq.why ? (
                        <p className="hint" style={{ fontSize: 10.5, color: "var(--ink-2)" }}>
                          <b style={{ color: "var(--ink)" }}>Why </b>{mcq.why}
                        </p>
                      ) : null}
                      {mcq.wrongWhy ? (
                        <p className="hint" style={{ fontSize: 10.5 }}>
                          <b style={{ color: "var(--ink-2)" }}>If wrong </b>{mcq.wrongWhy}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p
                      style={{
                        whiteSpace: "pre-wrap",
                        fontSize: 13.5,
                        lineHeight: 1.6,
                        color: "var(--ink-2)",
                      }}
                    >
                      {proseOf(block.payload) || "Empty note."}
                    </p>
                  )}

                  <div className="row-line">
                    <form action={moveBlockAction}>
                      <input type="hidden" name="lessonId" value={lessonId} />
                      <input type="hidden" name="blockId" value={block.id} />
                      <input type="hidden" name="dir" value="-1" />
                      <button type="submit" className="btn sm ghost" disabled={index === 0}>
                        Up
                      </button>
                    </form>

                    <form action={moveBlockAction}>
                      <input type="hidden" name="lessonId" value={lessonId} />
                      <input type="hidden" name="blockId" value={block.id} />
                      <input type="hidden" name="dir" value="1" />
                      <button
                        type="submit"
                        className="btn sm ghost"
                        disabled={index === blocks.length - 1}
                      >
                        Down
                      </button>
                    </form>

                    <BlockEditor
                      mode="edit"
                      lessonId={lessonId}
                      blockId={block.id}
                      initial={
                        mcq
                          ? { kind: "mcq", ...mcq }
                          : { kind: "prose", md: proseOf(block.payload) }
                      }
                    />

                    <form action={deleteBlockAction}>
                      <input type="hidden" name="lessonId" value={lessonId} />
                      <input type="hidden" name="blockId" value={block.id} />
                      <button type="submit" className="btn sm danger">Delete</button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="sec">
        <h2>Add a block</h2>
        <span>note first, then a question</span>
      </div>

      <div className="form-grid">
        <div className="row-line">
          <BlockEditor mode="add" kind="prose" lessonId={lessonId} />
          <BlockEditor mode="add" kind="mcq" lessonId={lessonId} />
        </div>
      </div>

      <div style={{ height: 32 }} />
    </>
  );
}
