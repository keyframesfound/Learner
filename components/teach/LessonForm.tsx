"use client";

import { useFormStatus } from "react-dom";
import { deleteLessonAction, setStatusAction, updateLessonAction } from "@/app/teach/content-actions";

type Props = {
  lessonId: string;
  title: string;
  summary: string;
  minutes: number;
  status: "draft" | "published" | "archived";
};

function Pending({
  label,
  busy,
  className,
}: {
  label: string;
  busy: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? busy : label}
    </button>
  );
}

export default function LessonForm({ lessonId, title, summary, minutes, status }: Props) {
  const next = status === "published" ? "draft" : "published";

  return (
    <div className="form-grid" style={{ gap: 14 }}>
      <form action={updateLessonAction} style={{ display: "grid", gap: 12 }}>
        <input type="hidden" name="lessonId" value={lessonId} />

        <div className="field">
          <label className="label" htmlFor="lesson-title">Title</label>
          <input
            id="lesson-title"
            name="title"
            className="input"
            defaultValue={title}
            required
            minLength={3}
            maxLength={80}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="lesson-summary">Summary</label>
          <textarea
            id="lesson-summary"
            name="summary"
            className="textarea"
            defaultValue={summary}
            maxLength={200}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="lesson-minutes">Minutes</label>
          <input
            id="lesson-minutes"
            name="minutes"
            type="number"
            className="input"
            min={2}
            max={8}
            defaultValue={minutes}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="lesson-status">Status</label>
          <select id="lesson-status" name="status" className="select" defaultValue={status}>
            <option value="draft">Draft — hidden from students</option>
            <option value="published">Published — in the student path</option>
            <option value="archived">Archived — retired</option>
          </select>
        </div>

        <Pending label="Save settings" busy="Saving…" className="btn" />
      </form>

      <div className="row-line">
        <form action={setStatusAction}>
          <input type="hidden" name="lessonId" value={lessonId} />
          <input type="hidden" name="status" value={next} />
          <Pending
            label={next === "published" ? "Publish" : "Unpublish"}
            busy="Working…"
            className="btn sm ghost"
          />
        </form>

        <form
          action={deleteLessonAction}
          onSubmit={(event) => {
            if (!window.confirm("Delete this lesson and every block in it?")) event.preventDefault();
          }}
        >
          <input type="hidden" name="lessonId" value={lessonId} />
          <Pending label="Delete lesson" busy="Deleting…" className="btn sm danger" />
        </form>
      </div>

      <p className="hint">
        {status === "published"
          ? "Live in the path for every class that follows this module."
          : status === "draft"
            ? "Draft lessons never reach the student path."
            : "Archived lessons stay readable but drop out of drilling."}
      </p>
    </div>
  );
}
