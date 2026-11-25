"use client";

import { useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { addMcqAction, addProseAction, updateBlockAction } from "@/app/teach/content-actions";

export type BlockOption = { text: string; code?: boolean };

export type BlockInitial =
  | { kind: "prose"; md: string }
  | {
      kind: "mcq";
      prompt: string;
      code?: string[];
      options: BlockOption[];
      answer: number;
      why: string;
      wrongWhy: string;
    };

type McqInitial = Extract<BlockInitial, { kind: "mcq" }>;

type Props =
  | { mode: "add"; kind: "prose"; lessonId: string }
  | { mode: "add"; kind: "mcq"; lessonId: string }
  | { mode: "edit"; lessonId: string; blockId: string; initial: BlockInitial };

type Action = (formData: FormData) => Promise<void>;

const LETTERS = "ABCDE";

const letter = (i: number) => LETTERS[i] ?? "?";

function Save({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn sm" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

function ProseForm({
  lessonId,
  blockId,
  editing,
  initialText,
  action,
  onClose,
}: {
  lessonId: string;
  blockId?: string;
  editing: boolean;
  initialText: string;
  action: Action;
  onClose: () => void;
}) {
  const uid = useId();
  const mdId = uid + "-md";

  return (
    <form action={action} style={{ display: "grid", gap: 10, width: "100%" }}>
      <input type="hidden" name="lessonId" value={lessonId} />
      {blockId ? <input type="hidden" name="blockId" value={blockId} /> : null}
      {editing ? <input type="hidden" name="kind" value="prose" /> : null}

      <div className="field">
        <label className="label" htmlFor={mdId}>Note</label>
        <textarea
          id={mdId}
          name="md"
          className="textarea"
          defaultValue={initialText}
          required
        />
        <span className="hint">Plain text or Markdown. Students read this before drilling.</span>
      </div>

      <div className="row-line">
        <Save label={editing ? "Save note" : "Add note"} />
        <button type="button" className="btn sm ghost" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

function McqForm({
  lessonId,
  blockId,
  editing,
  initial,
  action,
  onClose,
}: {
  lessonId: string;
  blockId?: string;
  editing: boolean;
  initial: McqInitial | null;
  action: Action;
  onClose: () => void;
}) {
  const uid = useId();
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [code, setCode] = useState((initial?.code ?? []).join("\n"));
  const [options, setOptions] = useState<BlockOption[]>(
    initial && initial.options.length >= 2 ? initial.options : [{ text: "" }, { text: "" }],
  );
  const [answer, setAnswer] = useState(() => {
    const n = initial?.answer ?? 0;
    return initial && n >= 0 && n < initial.options.length ? n : 0;
  });
  const [why, setWhy] = useState(initial?.why ?? "");
  const [wrongWhy, setWrongWhy] = useState(initial?.wrongWhy ?? "");
  const [error, setError] = useState<string | null>(null);

  const setOption = (index: number, patch: Partial<BlockOption>) => {
    setOptions((prev) => prev.map((option, i) => (i === index ? { ...option, ...patch } : option)));
  };

  const addOption = () => {
    if (options.length >= 5) return;
    setOptions((prev) => [...prev, { text: "" }]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
    setAnswer((prev) => (index === prev ? 0 : index < prev ? prev - 1 : prev));
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const problem = !prompt.trim()
      ? "Write the question prompt."
      : options.length < 2
        ? "Add at least two options."
        : options.some((option) => !option.text.trim())
          ? "Every option needs text."
          : answer < 0 || answer >= options.length
            ? "Mark which option is correct."
            : null;

    if (problem) {
      event.preventDefault();
      setError(problem);
      return;
    }
    setError(null);
  };

  return (
    <form action={action} onSubmit={onSubmit} style={{ display: "grid", gap: 10, width: "100%" }}>
      <input type="hidden" name="lessonId" value={lessonId} />
      {blockId ? <input type="hidden" name="blockId" value={blockId} /> : null}
      {editing ? <input type="hidden" name="kind" value="mcq" /> : null}
      <input type="hidden" name="options" value={JSON.stringify(options)} />
      <input type="hidden" name="answer" value={answer} />

      <div className="field">
        <label className="label" htmlFor={uid + "-prompt"}>Prompt</label>
        <input
          id={uid + "-prompt"}
          name="prompt"
          className="input"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          required
        />
      </div>

      <div className="field">
        <label className="label" htmlFor={uid + "-code"}>Code (optional, one line per row)</label>
        <textarea
          id={uid + "-code"}
          name="code"
          className="textarea mono"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          spellCheck={false}
        />
      </div>

      <fieldset style={{ border: 0, padding: 0, display: "grid", gap: 8 }}>
        <legend className="label" style={{ marginBottom: 8 }}>Options — mark the correct one</legend>

        {options.map((option, k) => (
          <div key={k} className="row-line" style={{ flexWrap: "nowrap" }}>
            <label className="row-line" style={{ gap: 5, flex: "0 0 auto" }}>
              <input
                type="radio"
                name={uid + "-answer"}
                checked={answer === k}
                onChange={() => setAnswer(k)}
              />
              <span className="mono" style={{ fontSize: 10, fontWeight: 700 }}>{letter(k)}</span>
            </label>

            <input
              className="input"
              style={{ flex: 1, minWidth: 0 }}
              aria-label={"Option " + letter(k) + " text"}
              value={option.text}
              onChange={(event) => setOption(k, { text: event.target.value })}
            />

            <label className="row-line" style={{ gap: 4, flex: "0 0 auto" }}>
              <input
                type="checkbox"
                checked={option.code === true}
                onChange={(event) => setOption(k, { code: event.target.checked })}
              />
              <span className="hint">code</span>
            </label>

            <button
              type="button"
              className="btn sm ghost"
              onClick={() => removeOption(k)}
              disabled={options.length <= 2}
              aria-label={"Remove option " + letter(k)}
            >
              ✕
            </button>
          </div>
        ))}

        <div className="row-line">
          <button
            type="button"
            className="btn sm ghost"
            onClick={addOption}
            disabled={options.length >= 5}
          >
            Add option
          </button>
          <span className="hint">{options.length} of 5</span>
        </div>
      </fieldset>

      <div className="field">
        <label className="label" htmlFor={uid + "-why"}>Why it is right</label>
        <textarea
          id={uid + "-why"}
          name="why"
          className="textarea"
          value={why}
          onChange={(event) => setWhy(event.target.value)}
          required
        />
      </div>

      <div className="field">
        <label className="label" htmlFor={uid + "-wrong"}>Why the others are wrong</label>
        <textarea
          id={uid + "-wrong"}
          name="wrongWhy"
          className="textarea"
          value={wrongWhy}
          onChange={(event) => setWrongWhy(event.target.value)}
          required
        />
      </div>

      {error ? (
        <p className="hint" role="alert" style={{ color: "var(--red-ink)", fontSize: 11 }}>{error}</p>
      ) : null}

      <div className="row-line">
        <Save label={editing ? "Save question" : "Add question"} />
        <button type="button" className="btn sm ghost" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

export default function BlockEditor(props: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    const label =
      props.mode === "edit" ? "Edit" : props.kind === "prose" ? "Add note" : "Add question";
    return (
      <button type="button" className="btn sm ghost" onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }

  const close = () => setOpen(false);

  if (props.mode === "edit") {
    const { lessonId, blockId, initial } = props;
    return initial.kind === "prose" ? (
      <ProseForm
        lessonId={lessonId}
        blockId={blockId}
        editing
        initialText={initial.md}
        action={updateBlockAction}
        onClose={close}
      />
    ) : (
      <McqForm
        lessonId={lessonId}
        blockId={blockId}
        editing
        initial={initial}
        action={updateBlockAction}
        onClose={close}
      />
    );
  }

  return props.kind === "prose" ? (
    <ProseForm
      lessonId={props.lessonId}
      editing={false}
      initialText=""
      action={addProseAction}
      onClose={close}
    />
  ) : (
    <McqForm
      lessonId={props.lessonId}
      editing={false}
      initial={null}
      action={addMcqAction}
      onClose={close}
    />
  );
}
