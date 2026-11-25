import Link from "next/link";
import { redirect } from "next/navigation";
import { isStaff, viewer } from "@/lib/repo";
import { lessonsOf, teacherClasses, type LessonRow } from "@/lib/teach";
import {
  ageShort,
  choiceEvidence,
  levelLabel,
  lessonCounts,
  moduleList,
  pickModule,
  questionRows,
  savedLabel,
} from "@/app/teach/data";
import ChapterSelect from "@/components/teach/ChapterSelect";
import QuestionEditor, { type EditorOption } from "@/components/teach/QuestionEditor";

type Params = { c?: string; l?: string; q?: string };

type McqView = {
  prompt: string;
  options: EditorOption[];
  answer: number;
  why: string;
  wrongWhy: string;
  code: string[];
};

function readMcq(payload: Record<string, unknown>): McqView {
  const raw = Array.isArray(payload.options) ? payload.options : [];
  const options: EditorOption[] = [];
  for (const item of raw) {
    const row = (item ?? {}) as Record<string, unknown>;
    const label = String(row.text ?? "");
    if (!label) continue;
    options.push(row.code === true ? { text: label, code: true } : { text: label });
  }
  const answer = Number(payload.answer ?? 0);
  return {
    prompt: String(payload.prompt ?? ""),
    options,
    answer: Number.isFinite(answer) ? answer : 0,
    why: String(payload.why ?? ""),
    wrongWhy: String(payload.wrongWhy ?? ""),
    code: Array.isArray(payload.code) ? payload.code.map(String) : [],
  };
}

const letter = (i: number) => String.fromCharCode(65 + i);

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const v = await viewer();
  if (!v) redirect("/login");
  if (!isStaff(v)) redirect("/login");
  const sp = await searchParams;

  const [modules, classes] = await Promise.all([moduleList(), teacherClasses(v)]);
  const active = modules.find((m) => m.id === sp.c)
    ?? pickModule(modules, classes as { module_id: string | null }[]);

  if (!active) {
    return (
      <section className="screen on" id="questions">
        <div className="topstrip">
          <Link className="fchip add" href="/teach/new">+ New curriculum</Link>
          <span className="spacer" />
        </div>
        <div className="body">
          <div className="panes" style={{ marginTop: 0 }}>
            <div className="edit">
              <div className="etitle">No curriculum yet</div>
              <div className="thint" style={{ padding: 0 }}>
                Questions live inside a chapter. Create a curriculum and a chapter first.
              </div>
              <Link className="b solid" href="/teach/new" style={{ display: "inline-flex", alignItems: "center", marginTop: 14 }}>
                New curriculum
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const lessons: LessonRow[] = await lessonsOf(active.id);
  const counts = await lessonCounts(active.id);
  const countById = new Map(counts.map((c) => [c.id, c]));

  const selectedLesson: LessonRow | null = lessons.find((l) => l.id === sp.l) ?? lessons[0] ?? null;
  const rows = selectedLesson ? await questionRows(selectedLesson.id) : [];

  const picked = sp.q && sp.q !== "new" ? rows.find((r) => r.id === sp.q) : undefined;
  const selected = picked ?? (sp.q === "new" ? null : rows[0] ?? null);
  const newMode = sp.q === "new" || rows.length === 0;

  const evidence = selected ? await choiceEvidence(selected.id) : null;

  const lessonHref = selectedLesson
    ? `/teach/questions?c=${encodeURIComponent(active.id)}&l=${encodeURIComponent(selectedLesson.id)}`
    : `/teach/questions?c=${encodeURIComponent(active.id)}`;
  const notesHref = `/teach/curriculum?c=${encodeURIComponent(active.id)}`
    + (selectedLesson ? `&l=${encodeURIComponent(selectedLesson.id)}` : "");

  const selectedIndex = selected ? rows.findIndex((r) => r.id === selected.id) : -1;
  const initial = selected ? readMcq(selected.payload) : null;

  return (
    <section className="screen on" id="questions">
      <div className="topstrip">
        {modules.map((module) => (
          <Link
            key={module.id}
            className={"fchip" + (module.id === active.id ? " on" : "")}
            href={`/teach/questions?c=${encodeURIComponent(module.id)}`}
          >
            {module.name}
            <span className="c">{module.classes} {module.classes === 1 ? "class" : "classes"}</span>
          </Link>
        ))}
        <Link className="fchip add" href="/teach/new">+ New curriculum</Link>
        <span className="div" />
        <div className="seg">
          <Link href={notesHref}>Notes</Link>
          <Link href={lessonHref} className="on">Questions</Link>
        </div>
        <span className="spacer" />
        <span className="autosave">
          {savedLabel(selectedLesson ? countById.get(selectedLesson.id)?.updated_at ?? null : null)}
        </span>
      </div>

      <div className="body">
        <div className="qbar">
          <span className="lbl">Chapter</span>
          {selectedLesson ? (
            <ChapterSelect
              moduleId={active.id}
              value={selectedLesson.id}
              options={lessons.map((lesson) => ({ id: lesson.id, title: lesson.title }))}
            />
          ) : (
            <span className="mono dim3">No chapters yet</span>
          )}
          {selectedLesson ? (
            <span className="mono dim3">
              {rows.length} {rows.length === 1 ? "question" : "questions"} · {countById.get(selectedLesson.id)?.notes ?? 0} {(countById.get(selectedLesson.id)?.notes ?? 0) === 1 ? "note" : "notes"}
            </span>
          ) : null}
        </div>

        <div className="qwrap">
          <div className="qlist">
            <div className="bt">
              <div className="r h" style={{ gridTemplateColumns: "1fr 190px 90px 100px 90px" }}>
                <div>Question</div><div>Answer</div><div>Wrong</div><div>Level</div><div>Edited</div>
              </div>

              {selectedLesson ? (
                <Link className="r addq" href={`${lessonHref}&q=new`}>
                  <span><b>+</b> New question in {selectedLesson.title}</span>
                </Link>
              ) : null}

              {rows.map((row) => {
                const mcq = readMcq(row.payload);
                const wrongPct = Number(row.graded) > 0 ? Math.round((100 * Number(row.wrong)) / Number(row.graded)) : null;
                const current = selected?.id === row.id;
                return (
                  <Link
                    key={row.id}
                    className={"r" + (current ? " cur" : "")}
                    style={{ gridTemplateColumns: "1fr 190px 90px 100px 90px" }}
                    href={`${lessonHref}&q=${encodeURIComponent(row.id)}`}
                  >
                    <div className="stem">{mcq.prompt}</div>
                    <div className="ans">
                      <span className="k">{letter(mcq.answer)}</span> {mcq.options[mcq.answer]?.text ?? ""}
                    </div>
                    <div className={"mono" + (wrongPct !== null && wrongPct >= 50 ? " hot" : wrongPct === null ? " dim3" : "")}>
                      {wrongPct === null ? "—" : `${wrongPct}%`}
                    </div>
                    <div className="lvl">{levelLabel(row.level)}</div>
                    <div className="mono dim3">{ageShort(row.created_at)}</div>
                  </Link>
                );
              })}
            </div>

            <div className="qfoot">
              <span>
                {rows.length} {rows.length === 1 ? "question" : "questions"} · wrong share is from all attempts
              </span>
            </div>
          </div>

          {selectedLesson && (selected || newMode) ? (
            <QuestionEditor
              lessonId={selectedLesson.id}
              blockId={selected?.id ?? null}
              itemNumber={selectedIndex >= 0 ? selectedIndex + 1 : 0}
              level={selected ? levelLabel(selected.level) : "Core"}
              prompt={initial?.prompt ?? ""}
              code={initial?.code ?? []}
              options={initial?.options ?? []}
              answer={initial?.answer ?? 0}
              why={initial?.why ?? ""}
              wrongWhy={initial?.wrongWhy ?? ""}
              evidence={evidence ? { letter: evidence.letter, pct: evidence.pct, graded: evidence.graded } : null}
              back={`${lessonHref}`}
            />
          ) : (
            <div className="qed">
              <div className="hd"><b>Questions</b></div>
              <div className="thint" style={{ padding: 0 }}>
                Add the first chapter before writing questions.
              </div>
              <Link
                className="b solid"
                href={`/teach/curriculum?c=${encodeURIComponent(active.id)}&new=lesson`}
                style={{ display: "inline-flex", alignItems: "center", alignSelf: "flex-start" }}
              >
                New chapter
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
