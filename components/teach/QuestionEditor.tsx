"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { addMcqAction, deleteBlockAction, updateBlockAction } from "@/app/teach/content-actions";

export type EditorOption = { text: string; code?: boolean };
export type EditorEvidence = { letter: string; pct: number; graded: number };

type Props = {
  lessonId: string;
  blockId: string | null;
  itemNumber: number;
  level: string;
  prompt: string;
  code: string[];
  options: EditorOption[];
  answer: number;
  why: string;
  wrongWhy: string;
  evidence: EditorEvidence | null;
  back: string;
};

const letter = (i: number) => String.fromCharCode(65 + i);

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="b sm solid" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

export default function QuestionEditor(props: Props) {
  const { lessonId, blockId } = props;
  const [prompt, setPrompt] = useState(props.prompt);
  const [options, setOptions] = useState<EditorOption[]>(
    props.options.length >= 2 ? props.options : [{ text: "" }, { text: "" }, { text: "" }, { text: "" }],
  );
  const [answer, setAnswer] = useState(
    props.answer >= 0 && props.answer < options.length ? props.answer : 0,
  );
  const [why, setWhy] = useState(props.why);
  const [code, setCode] = useState(props.code.join("\n"));
  const [error, setError] = useState<string | null>(null);

  const setOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((option, i) => (i === index ? { text: value } : option)));
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const problem = !prompt.trim()
      ? "Write the question stem."
      : options.some((option) => !option.text.trim())
        ? "Every option needs text."
        : !why.trim()
          ? "Write why the answer is right."
          : null;
    if (problem) {
      event.preventDefault();
      setError(problem);
      return;
    }
    setError(null);
  };

  return (
    <div className="qed">
      <div className="hd">
        <b>{blockId ? `Editing item ${props.itemNumber}` : "New item"}</b>
        <span className="lvl">{props.level}</span>
      </div>

      <form
        action={blockId ? updateBlockAction : addMcqAction}
        onSubmit={onSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        <input type="hidden" name="lessonId" value={lessonId} />
        {blockId ? <input type="hidden" name="blockId" value={blockId} /> : null}
        <input type="hidden" name="kind" value="mcq" />
        <input type="hidden" name="options" value={JSON.stringify(options)} />
        <input type="hidden" name="answer" value={answer} />
        <input type="hidden" name="wrongWhy" value={props.wrongWhy} />
        <input type="hidden" name="back" value={props.back} />

        <input
          className="fld"
          name="prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.45 }}
          aria-label="Question stem"
          maxLength={240}
          required
        />

        {options.map((option, index) => (
          <div className={"oq" + (answer === index ? " on" : "")} key={index}>
            <u
              role="radio"
              aria-checked={answer === index}
              aria-label={"Mark option " + letter(index) + " correct"}
              tabIndex={0}
              onClick={() => setAnswer(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setAnswer(index);
                }
              }}
            >
              {letter(index)}
            </u>
            <input
              type="text"
              value={option.text}
              onChange={(event) => setOption(index, event.target.value)}
              aria-label={"Option " + letter(index)}
              required
            />
          </div>
        ))}

        {props.code.length > 0 ? (
          <>
            <div className="bk" style={{ margin: "2px 0 0" }}>Code</div>
            <textarea
              className="fld"
              name="code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              rows={Math.min(8, Math.max(2, code.split("\n").length))}
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 }}
              spellCheck={false}
            />
          </>
        ) : (
          <input type="hidden" name="code" value="" />
        )}

        <div className="bk" style={{ margin: "2px 0 0" }}>Why, in one line</div>
        <textarea
          className="fld"
          name="why"
          value={why}
          onChange={(event) => setWhy(event.target.value)}
          rows={2}
          required
        />

        {props.evidence ? (
          <div className="ev">
            <b>{props.evidence.pct}% answered {props.evidence.letter}.</b>{" "}
            {props.evidence.graded} graded {props.evidence.graded === 1 ? "attempt" : "attempts"} on this item.
          </div>
        ) : null}

        {error ? <p className="hint" role="alert" style={{ color: "var(--red-ink)" }}>{error}</p> : null}

        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
          <SaveButton label={blockId ? "Save item" : "Add item"} />
          {blockId ? (
            <button
              type="submit"
              className="b sm"
              formAction={deleteBlockAction}
              formNoValidate
              onClick={(event) => {
                if (!window.confirm("Delete this question?")) event.preventDefault();
              }}
            >
              Delete item
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
