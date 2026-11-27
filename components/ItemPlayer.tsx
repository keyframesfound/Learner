"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { NoteBlock, PlayerItem } from "@/lib/repo";
import "../app/drill/item.css";

/* **term** renders as a bold term, without pulling in a markdown library */
function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <b key={i}>{part.slice(2, -2)}</b>
      : <span key={i}>{part}</span>,
  );
}

/* a light touch of syntax colour for code lines: keywords, numbers, strings */
const KEYWORD =
  /^(?:print|def|return|if|elif|else|for|while|in|not|and|or|import|from|class|True|False|None|range|len|int|str|float|list|dict|set|tuple|is|with|as|try|except|pass|lambda)$/;
const TOKEN = /(#[^\n]*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b)/g;

function codeLine(line: string, k: number) {
  return (
    <span key={k} className="v-line">
      <span className="v-ln">{k + 1}</span>
      {line.split(TOKEN).filter((s) => s !== "").map((s, j) => {
        if (s.startsWith("#")) return <span key={j} className="v-c">{s}</span>;
        if (s.startsWith('"') || s.startsWith("'")) return <span key={j} className="v-s">{s}</span>;
        if (/^\d/.test(s)) return <span key={j} className="v-n">{s}</span>;
        if (KEYWORD.test(s)) return <span key={j} className="v-k">{s}</span>;
        return <span key={j}>{s}</span>;
      })}
    </span>
  );
}

/** What the server says about one answer. The key never travels with the page. */
type Verdict = {
  correct: boolean;
  answerIndex: number | null;
  answerText: string;
  why: string;
  wrongWhy: string;
};

type Props = {
  items: PlayerItem[];
  lessonId: string;
  moduleId: string;
  lessonTitle: string;
  nextSlug?: string;
  nextTitle?: string;
  lessonNumber?: number;
  notes?: NoteBlock[];
};

export default function ItemPlayer({
  items,
  lessonId,
  moduleId,
  lessonTitle,
  nextSlug,
  nextTitle,
  lessonNumber,
  notes = [],
}: Props) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [reading, setReading] = useState(notes.length > 0);
  const start = useRef(0);
  const field = useRef<HTMLInputElement | null>(null);
  const step = String(lessonNumber ?? 1).padStart(2, "0");

  useEffect(() => {
    start.current = performance.now();
  }, [i]);

  const item = items[i];

  /* ── answering ─────────────────────────────────────────────── */

  const check = useCallback(async () => {
    if (!item || checked || pending) return;
    const isFill = item.kind === "fill";
    if (isFill ? typed.trim() === "" : picked === null) return;

    const ms = start.current > 0 ? Math.max(0, Math.round(performance.now() - start.current)) : 0;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/learner/api/attempt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          blockId: item.id,
          lessonId,
          moduleId,
          choice: isFill ? null : picked,
          text: isFill ? typed : null,
          ms,
        }),
        keepalive: true,
      });
      const data = (await res.json().catch(() => ({}))) as Verdict & { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Save failed (${res.status})`);
      setVerdict({
        correct: !!data.correct,
        answerIndex: data.answerIndex ?? null,
        answerText: data.answerText ?? "",
        why: data.why ?? "",
        wrongWhy: data.wrongWhy ?? "",
      });
      setChecked(true);
      if (data.correct) setCorrectCount((n) => n + 1);
    } catch (err) {
      /* never swallow this: an unrecorded answer is a hole in the student's record */
      setError(err instanceof Error ? err.message : "Could not save that answer.");
    } finally {
      setPending(false);
    }
  }, [checked, item, lessonId, moduleId, pending, picked, typed]);

  const next = useCallback(() => {
    if (i + 1 >= items.length) setDone(true);
    else {
      setI(i + 1);
      setPicked(null);
      setTyped("");
      setChecked(false);
      setVerdict(null);
      setError(null);
    }
  }, [i, items.length]);

  const pick = (k: number) => {
    if (checked || pending) return;
    setPicked(k);
  };

  /* ── keyboard: 1-4 / A-D to choose, Enter to check, Enter to continue ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || reading) return;
      const el = e.target as HTMLElement | null;
      const typing = el?.tagName === "INPUT" || el?.tagName === "TEXTAREA";
      if (e.key === "Enter") {
        e.preventDefault();
        if (checked) next();
        else void check();
        return;
      }
      if (checked || typing || !item || item.kind === "fill") return;
      const k = "1234".indexOf(e.key) >= 0 ? "1234".indexOf(e.key) : "abcd".indexOf(e.key.toLowerCase());
      if (k >= 0 && k < item.options.length) {
        e.preventDefault();
        pick(k);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [checked, check, done, item, next, reading]);

  useEffect(() => {
    if (item?.kind === "fill" && !checked) field.current?.focus();
  }, [i, item, checked]);

  /* ── chrome ────────────────────────────────────────────────── */

  const topBar = (at: number) => (
    <div className="v-top">
      <Link href="/drill" className="v-x" aria-label="Leave lesson">✕</Link>
      <span
        className="v-prog"
        role="progressbar"
        aria-label="Question progress"
        aria-valuemin={0}
        aria-valuemax={Math.max(items.length, 1)}
        aria-valuenow={at}
        style={{ "--ticks": Math.max(items.length, 1) } as CSSProperties}
      >
        <i style={{ width: `${items.length ? (at / items.length) * 100 : 0}%` }} />
      </span>
      <span className="v-count">{step} · {at} / {items.length}</span>
    </div>
  );

  if (done) {
    const pct = items.length ? Math.round((correctCount / items.length) * 100) : 0;
    const perfect = correctCount === items.length && items.length > 0;
    return (
      <div className="v-item is-done">
        <div className="v-scroll v-center">
          <div className="v-done">
            <div className={"v-burst" + (perfect ? " perfect" : "")}>
              <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" aria-hidden="true">
                <path d="M12 2.6l2.9 5.9 6.5 1-4.7 4.6 1.1 6.5L12 17.5 6.2 20.6l1.1-6.5L2.6 9.5l6.5-1z" />
              </svg>
            </div>

            <div className="v-kicker">{perfect ? "Flawless" : "Lesson complete"}</div>
            <h1 className="v-done-title">{perfect ? "Perfect run." : "Lesson complete."}</h1>
            <p className="v-done-sub">{lessonTitle}</p>

            <div className="v-stats">
              <div className="v-stat">
                <b>{correctCount}/{items.length}</b>
                <span>correct</span>
              </div>
              <div className="v-stat">
                <b>{pct}%</b>
                <span>accuracy</span>
              </div>
            </div>

            <div className="v-actions">
              {nextSlug ? (
                <>
                  <Link href={`/drill/${nextSlug}`} className="v-btn">
                    Next lesson{nextTitle ? `: ${nextTitle}` : ""} →
                  </Link>
                  <Link href="/drill" className="v-btn v-btn-ghost">
                    Back to the path
                  </Link>
                </>
              ) : (
                <Link href="/drill" className="v-btn">Back to the path →</Link>
              )}
              <Link href="/party" className="v-done-link">
                Party up for the boss
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (reading) {
    return (
      <div className="v-item">
        {topBar(0)}

        <div className="v-scroll">
          <div className="v-notes">
            <div className="v-kicker">Read first</div>
            <h1 className="v-ntitle">{lessonTitle}</h1>
            {notes.map((n, k) => {
              if (n.type === "table") {
                return (
                  <div key={k} className="v-tablewrap">
                    <table className="v-cmp">
                      <thead>
                        <tr>{n.head.map((h, hi) => <th key={hi}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {n.rows.map((row, ri) => (
                          <tr key={ri}>
                            {row.map((c, ci) =>
                              ci === 0 ? <th key={ci}>{c}</th> : <td key={ci}>{c}</td>,
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }
              if (n.type === "callout") {
                return (
                  <div key={k} className="v-callout"><b>EXAM</b><span>{inline(n.text)}</span></div>
                );
              }
              return <p key={k} className="v-p">{inline(n.text)}</p>;
            })}

            {items.length ? (
              <button className="v-btn v-cta" onClick={() => setReading(false)}>
                Start questions · {items.length}
              </button>
            ) : (
              <Link href="/drill" className="v-btn v-cta">Back to the path</Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0 || !item) {
    return (
      <div className="v-item">
        {topBar(0)}
        <div className="v-scroll">
          <div className="v-notes">
            <h1 className="v-ntitle">{lessonTitle}</h1>
            <div className="v-empty">
              <b>Nothing to answer</b>
              <p>This lesson has no questions yet.</p>
              <Link href="/drill" className="v-btn">Back to the path</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isFill = item.kind === "fill";
  const last = i === items.length - 1;
  const canCheck = isFill ? typed.trim() !== "" : picked !== null;
  const answerLine = verdict
    ? verdict.answerText
      ? `Answer: ${verdict.answerIndex != null ? "ABCD"[verdict.answerIndex] + " — " : ""}${verdict.answerText}`
      : ""
    : "";
  const feedback = verdict
    ? (verdict.correct ? verdict.why : verdict.wrongWhy) || answerLine
    : "";

  return (
    <div className="v-item">
      {topBar(i + 1)}

      <div className="v-scroll">
        <span className="v-tag">{item.level}</span>
        <h2 className={"v-q" + (item.prompt.length > 90 ? " long" : "")}>{item.prompt}</h2>
        {item.code && <div className="v-code">{item.code.map(codeLine)}</div>}

        {isFill ? (
          <div className="v-fill">
            <label htmlFor="answer" className="v-fill-label">Your answer</label>
            <input
              id="answer"
              ref={field}
              className={"v-input" + (checked ? (verdict?.correct ? " good" : " bad") : "")}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={checked || pending}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Type it exactly as the paper would"
            />
            <p className="v-fill-hint">Case and spacing do not matter.</p>
          </div>
        ) : (
          <div className="v-opts">
            {item.options.map((o, k) => {
              const state = !checked
                ? k === picked ? " sel" : ""
                : k === verdict?.answerIndex ? " good" : k === picked ? " bad" : "";
              return (
                <button
                  key={k}
                  type="button"
                  className={"v-opt" + state}
                  aria-pressed={k === picked}
                  disabled={checked || pending}
                  onClick={() => pick(k)}
                >
                  <span className="v-letter">{"ABCD"[k]}</span>
                  <span className={o.code ? "v-codetext" : undefined}>{o.text}</span>
                </button>
              );
            })}
          </div>
        )}

        {item.source ? <p className="v-source">{item.source}</p> : null}
      </div>

      <div className={"v-band" + (checked ? (verdict?.correct ? " ok" : " bad") : "")}>
        {error ? <p className="v-error">{error}</p> : null}
        {checked && (
          <>
            <b className="v-verdict">{verdict?.correct ? "Correct" : "Not quite"}</b>
            {feedback ? <p className="v-why">{feedback}</p> : null}
          </>
        )}
        {checked ? (
          <button className="v-btn" onClick={next}>
            {last ? "Finish lesson" : "Continue"}
          </button>
        ) : (
          <button className="v-btn" onClick={() => void check()} disabled={!canCheck || pending}>
            {pending ? "Saving…" : "Check"}
          </button>
        )}
      </div>
    </div>
  );
}
