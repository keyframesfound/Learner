import Link from "next/link";
import { redirect } from "next/navigation";
import { isStaff, parseNotes, viewer } from "@/lib/repo";
import { blocksOf, lessonsOf, teacherClasses, type BlockRow, type LessonRow } from "@/lib/teach";
import { lessonCounts, moduleList, pickModule, savedLabel } from "@/app/teach/data";
import {
  createLessonAction,
  deleteCurriculumAction,
  deleteLessonAction,
  setStatusAction,
  updateLessonAction,
} from "@/app/teach/content-actions";
import NoteBlock, { type BlockView } from "@/components/teach/NoteBlock";
import AddBlock from "@/components/teach/AddBlock";
import ConfirmSubmit from "@/components/teach/ConfirmSubmit";
import NewCurriculumField from "@/components/teach/NewCurriculumField";

type Params = {
  c?: string;
  l?: string;
  b?: string;
  new?: string;
  preview?: string;
  error?: string;
};

function viewOf(block: BlockRow): BlockView {
  const parsed = parseNotes([block])[0];
  if (!parsed) return { kind: "note", text: String(block.payload?.md ?? "") };
  if (parsed.type === "table") return { kind: "table", head: parsed.head, rows: parsed.rows };
  if (parsed.type === "callout") return { kind: "callout", text: parsed.text };
  return { kind: "note", text: parsed.text };
}

function labelOf(block: BlockRow) {
  const parsed = parseNotes([block])[0];
  if (parsed?.type === "table") {
    const head = parsed.head.filter(Boolean);
    const label = head.length > 0 ? `Table — ${head.join(" · ")}` : "Table";
    return label.length > 60 ? label.slice(0, 57) + "…" : label;
  }
  if (parsed?.type === "callout") return "Exam callout";
  /* the tree shows prose, not markdown */
  const first = String(block.payload?.md ?? "")
    .replace(/\*\*/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)[0] ?? "Note";
  return first.length > 60 ? first.slice(0, 57) + "…" : first;
}

export default async function CurriculumPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const v = await viewer();
  if (!v) redirect("/login");
  if (!isStaff(v)) redirect("/login");
  const sp = await searchParams;

  const [modules, classes] = await Promise.all([moduleList(), teacherClasses(v)]);
  const active = modules.find((m) => m.id === sp.c)
    ?? pickModule(modules, classes as { module_id: string | null }[]);

  if (!active) {
    return (
      <section className="screen on" id="curriculum">
        <div className="topstrip">
          <NewCurriculumField trackId="" placeholder="New curriculum" />
          <span className="spacer" />
        </div>
        <div className="body">
          <h1>Curriculum</h1>
          <div className="sub">No curriculum yet</div>
          <div className="panes" style={{ marginTop: 16 }}>
            <div className="edit">
              <div className="etitle">Start with a curriculum</div>
              <div className="thint" style={{ padding: 0 }}>
                A curriculum holds chapters, notes and questions. Create one, then add its first chapter.
              </div>
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
                <NewCurriculumField trackId={sp.c ?? ""} placeholder="Name the curriculum" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const [lessons, counts] = await Promise.all([lessonsOf(active.id), lessonCounts(active.id)]);
  const countById = new Map(counts.map((c) => [c.id, c]));

  const selectedLesson: LessonRow | null = lessons.find((l) => l.id === sp.l) ?? lessons[0] ?? null;
  const blocks: BlockRow[] = selectedLesson ? await blocksOf(selectedLesson.id) : [];
  const notes = blocks.filter((b) => b.kind === "prose" || b.kind === "callout");

  const picked = sp.b && sp.b !== "new" ? notes.find((b) => b.id === sp.b) : undefined;
  const selectedBlock = picked ?? (sp.b === "new" ? null : notes[0] ?? null);
  const noteIndex = selectedBlock ? notes.findIndex((b) => b.id === selectedBlock.id) + 1 : 0;

  const lessonHref = selectedLesson
    ? `/teach/curriculum?c=${encodeURIComponent(active.id)}&l=${encodeURIComponent(selectedLesson.id)}`
    : `/teach/curriculum?c=${encodeURIComponent(active.id)}`;
  const updatedAt = selectedLesson ? countById.get(selectedLesson.id)?.updated_at ?? null : null;
  const noteCount = selectedLesson ? countById.get(selectedLesson.id)?.notes ?? 0 : 0;
  const questionCount = selectedLesson ? countById.get(selectedLesson.id)?.questions ?? 0 : 0;
  const formId = selectedLesson ? `lesson-${selectedLesson.id}` : "lesson-none";
  const edited = updatedAt ? savedLabel(updatedAt).replace(/^Saved /, "") : "not saved";

  const questionsHref = `/teach/questions?c=${encodeURIComponent(active.id)}`
    + (selectedLesson ? `&l=${encodeURIComponent(selectedLesson.id)}` : "");

  return (
    <section className="screen on" id="curriculum">
      <div className="topstrip">
        {sp.error === "delete-denied" ? (
          <span className="topnote">Another teacher&rsquo;s class follows that curriculum — move the class first.</span>
        ) : null}
        <div className="seg">
          <Link href={lessonHref} className="on">Notes</Link>
          <Link href={questionsHref}>Questions</Link>
        </div>
        <span className="spacer" />
        <span className="autosave">{savedLabel(updatedAt)}</span>
        <ConfirmSubmit
          action={deleteCurriculumAction}
          hidden={{ moduleId: active.id, back: `/teach/curriculum?c=${encodeURIComponent(active.id)}` }}
          label="Delete curriculum"
          className="b del"
          message={`Delete “${active.name}”?\n\nIts ${active.lessons} chapter(s), their questions and notes are removed for good, and any class following it loses the curriculum.`}
        />
        {selectedLesson ? (
          <form action={setStatusAction} style={{ marginLeft: 12 }}>
            <input type="hidden" name="lessonId" value={selectedLesson.id} />
            <input
              type="hidden"
              name="status"
              value={selectedLesson.status === "published" ? "draft" : "published"}
            />
            <button type="submit" className="b">
              {selectedLesson.status === "published" ? "Unpublish" : "Publish"}
            </button>
          </form>
        ) : null}
      </div>

      <div className="body">
        <div className="panes">
          <div className="tree">
            <div className="lblrow">
              <div className="lbl">Chapters</div>
              <Link className="mini" href={`/teach/curriculum?c=${encodeURIComponent(active.id)}&new=lesson`} aria-label="New chapter">+</Link>
            </div>

            {lessons.length === 0 ? (
              <div className="thint">No chapters yet. Add the first one.</div>
            ) : null}

            {lessons.map((lesson, index) => {
              const open = selectedLesson?.id === lesson.id;
              return (
                <div key={lesson.id}>
                  <Link
                    className={"ch" + (open ? " open" : "")}
                    href={`/teach/curriculum?c=${encodeURIComponent(active.id)}&l=${encodeURIComponent(lesson.id)}`}
                  >
                    <span className="i">{index + 1}</span>
                    <span>{lesson.title}</span>
                    <span className="n">{countById.get(lesson.id)?.notes ?? 0}</span>
                    {open ? <span className="dots">⋯</span> : null}
                  </Link>

                  {open
                    ? notes.map((block, blockIndex) => (
                        <Link
                          key={block.id}
                          className={"fr" + (block.id === selectedBlock?.id ? " on" : "")}
                          href={`${lessonHref}&b=${encodeURIComponent(block.id)}`}
                        >
                          <span className="g">⋮⋮</span>
                          <span className="i">{blockIndex + 1}</span>
                          <span>{labelOf(block)}</span>
                        </Link>
                      ))
                    : null}
                </div>
              );
            })}

            {selectedLesson ? (
              <>
                <div className="thint">Pick a note to edit it in place</div>
                <Link className="addrow in" href={`${lessonHref}&b=new`}>
                  <b>+</b> New note in {selectedLesson.title}
                </Link>
              </>
            ) : null}
            <Link className="addrow" href={`/teach/curriculum?c=${encodeURIComponent(active.id)}&new=lesson`}>
              <b>+</b> New chapter
            </Link>
          </div>

          <div className="edit">
            {sp.error ? (
              <p role="alert" style={{ color: "var(--red-ink)", fontSize: 11, marginBottom: 10 }}>
                {sp.error}
              </p>
            ) : null}

            {sp.new === "lesson" ? (
              <form action={createLessonAction} className="newc" style={{ marginBottom: 14 }}>
                <input type="hidden" name="moduleId" value={active.id} />
                <input type="hidden" name="back" value={`/teach/curriculum?c=${active.id}`} />
                <div className="lbl">New chapter</div>
                <div className="fl">Title</div>
                <input className="fld" name="title" required minLength={3} maxLength={80} aria-label="Chapter title" />
                <div className="fl">Minutes</div>
                <input className="fld" name="minutes" type="number" min={2} max={8} defaultValue={4} aria-label="Minutes" />
                <div className="fl">Summary</div>
                <textarea className="fld" name="summary" maxLength={200} rows={2} aria-label="Summary" />
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" className="b sm solid">Create chapter</button>
                  <Link className="b sm" href={lessonHref} style={{ display: "inline-flex", alignItems: "center" }}>Cancel</Link>
                </div>
              </form>
            ) : null}

            {!selectedLesson ? (
              <div style={{ padding: "6px 0" }}>
                <div className="etitle">No chapters yet</div>
                <div className="thint" style={{ padding: 0, fontSize: 11.5 }}>
                  A chapter holds the notes students read. Add the first chapter to this curriculum.
                </div>
                <Link
                  className="b solid"
                  href={`/teach/curriculum?c=${encodeURIComponent(active.id)}&new=lesson`}
                  style={{ display: "inline-flex", alignItems: "center", marginTop: 14 }}
                >
                  New chapter
                </Link>
              </div>
            ) : (
              <>
                <div className="crumb">
                  {active.name} / <b>{selectedLesson.title}</b> / note {noteIndex} of {notes.length}
                </div>

                <form id={formId} action={updateLessonAction}>
                  <input type="hidden" name="lessonId" value={selectedLesson.id} />
                  <input type="hidden" name="status" value={selectedLesson.status} />
                </form>

                <input
                  className="etitle"
                  name="title"
                  form={formId}
                  defaultValue={selectedLesson.title}
                  aria-label="Chapter title"
                  minLength={3}
                  maxLength={80}
                />

                {notes.length === 0 ? (
                  <div className="thint" style={{ padding: "0 0 8px", fontSize: 11.5 }}>
                    This chapter has no notes yet. Add the first block below.
                  </div>
                ) : null}

                {notes.map((block) => (
                  <NoteBlock
                    key={block.id}
                    lessonId={selectedLesson.id}
                    blockId={block.id}
                    kind={block.kind === "callout" ? "callout" : "prose"}
                    md={String(block.payload?.md ?? "")}
                    label={labelOf(block)}
                    view={viewOf(block)}
                    selected={block.id === selectedBlock?.id}
                    href={`${lessonHref}&b=${encodeURIComponent(block.id)}`}
                  />
                ))}

                <AddBlock
                  lessonId={selectedLesson.id}
                  back={lessonHref}
                  openWhenNew={sp.b === "new"}
                />

                <div className="efoot">
                  <span className="st">
                    <span className={"dot" + (selectedLesson.status === "published" ? "" : " draft")} />
                    {selectedLesson.status === "published" ? "Published" : "Draft"} · edited {edited}
                  </span>
                  <span className="spacer" />
                  <Link className="b sm" href={`${lessonHref}&preview=1`} style={{ display: "inline-flex", alignItems: "center" }}>
                    Preview as student
                  </Link>
                  <button type="submit" form={formId} className="b sm solid">Save</button>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10 }}>
                  <span className="mono dim3">{noteCount} {noteCount === 1 ? "note" : "notes"} · {questionCount} {questionCount === 1 ? "question" : "questions"}</span>
                  <span className="spacer" />
                  <ConfirmSubmit
                    action={deleteLessonAction}
                    hidden={{ lessonId: selectedLesson.id }}
                    label="Delete chapter"
                    message="Delete this chapter and every block in it?"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {sp.preview === "1" && selectedLesson ? (
        <div className="prev">
          <div className="ph">Preview · as a student sees it</div>
          <div className="phone">
            <div className="bar">{active.name} <i>{noteIndex} of {notes.length}</i></div>
            <div className="in">
              <h3>{selectedLesson.title}</h3>
              {notes.map((block) => {
                const parsed = parseNotes([block])[0];
                if (!parsed) return null;
                if (parsed.type === "table") {
                  return (
                    <div className="tbl" key={block.id}>
                      {[...parsed.head, ...parsed.rows.flat()].map((cell, i) => <div key={i}>{cell}</div>)}
                    </div>
                  );
                }
                if (parsed.type === "callout") {
                  return (
                    <div className="callout" key={block.id}>
                      <b>Marking</b><span>{parsed.text}</span>
                    </div>
                  );
                }
                return <p key={block.id}>{parsed.text}</p>;
              })}
            </div>
          </div>
          <Link
            className="b"
            href={`${lessonHref}&b=${selectedBlock?.id ?? ""}`}
            style={{ background: "#111", color: "#F2EFE6", borderColor: "#F2EFE6", boxShadow: "3px 3px 0 #4A4A45" }}
          >
            Back to the editor
          </Link>
        </div>
      ) : null}
    </section>
  );
}
