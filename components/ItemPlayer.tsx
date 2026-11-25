"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { NoteBlock, PlayerItem } from "@/lib/repo";

/* **term** renders as a bold term, without pulling in a markdown library */
function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <b key={i}>{part.slice(2, -2)}</b>
      : <span key={i}>{part}</span>,
  );
}

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

const btnLink = {
  display: "grid",
  placeItems: "center",
  textDecoration: "none",
} as const;

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
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [reading, setReading] = useState(notes.length > 0);
  const start = useRef(0);
  const step = String(lessonNumber ?? 1).padStart(2, "0");

  useEffect(() => {
    start.current = performance.now();
  }, [i]);

  if (done) {
    const pct = items.length ? Math.round((correctCount / items.length) * 100) : 0;
    const perfect = correctCount === items.length && items.length > 0;
    return (
      <div className="lesson-screen">
        <div className="done-wrap">
          <div className={"done-burst" + (perfect ? " perfect" : "")}>
            <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" aria-hidden="true">
              <path d="M12 2.6l2.9 5.9 6.5 1-4.7 4.6 1.1 6.5L12 17.5 6.2 20.6l1.1-6.5L2.6 9.5l6.5-1z" />
            </svg>
          </div>

          <div className="done-kicker mono">{perfect ? "Flawless" : "Lesson complete"}</div>
          <h1 className="done-title">{perfect ? "Perfect run." : "Lesson complete."}</h1>
          <p className="done-sub">{lessonTitle}</p>

          <div className="done-stats">
            <div className="done-stat">
              <b>{correctCount}/{items.length}</b>
              <span>correct</span>
            </div>
            <div className="done-stat">
              <b>{pct}%</b>
              <span>accuracy</span>
            </div>
          </div>

          <div className="done-actions">
            {nextSlug ? (
              <Link href={`/drill/${nextSlug}`} className="btn" style={btnLink}>
                Next lesson{nextTitle ? `: ${nextTitle}` : ""} →
              </Link>
            ) : (
              <Link href="/drill" className="btn" style={btnLink}>
                Back to the path →
              </Link>
            )}
            <Link href="/drill" className="btn ghost" style={btnLink}>
              Back to the path
            </Link>
            <Link href="/party" className="done-link">
              Party up for the boss
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (reading) {
    return (
      <div className="lesson-screen">
        <div className="lbar">
          <Link href="/drill" className="linkish" aria-label="Leave lesson">✕</Link>
          <span className="pbar"><i style={{ width: "0%" }} /></span>
          <span className="count">{step} · notes</span>
        </div>

        <div className="notes">
          <div className="notes-kicker mono">Read first</div>
          <h1 className="notes-title">{lessonTitle}</h1>
          {notes.map((n, k) => {
            if (n.type === "table") {
              return (
                <table key={k} className="cmp">
                  <thead><tr>{n.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {n.rows.map((row, ri) => (
                      <tr key={ri}>{row.map((c, ci) => (ci === 0 ? <th key={ci}>{c}</th> : <td key={ci}>{c}</td>))}</tr>
                    ))}
                  </tbody>
                </table>
              );
            }
            if (n.type === "callout") {
              return (
                <div key={k} className="callout"><b>EXAM</b><span>{inline(n.text)}</span></div>
              );
            }
            return <p key={k} className="notes-p">{inline(n.text)}</p>;
          })}
        </div>

        <div className="band">
          <button className="btn" onClick={() => setReading(false)}>
            {items.length ? `Start questions · ${items.length}` : "Back to the path"}
          </button>
        </div>
      </div>
    );
  }

  const item = items[i];
  if (items.length === 0 || !item) {
    return (
      <div className="note" style={{ paddingTop: 40 }}>
        <h1>{lessonTitle}</h1>
        <div className="empty">
          <b>Nothing to answer</b>
          <p>This lesson has no questions yet.</p>
        </div>
        <div style={{ display: "grid", gap: 9, marginTop: 18, maxWidth: 420 }}>
          <Link href="/drill" className="btn" style={btnLink}>
            Back to the path
          </Link>
        </div>
      </div>
    );
  }

  const correct = picked === item.answer;
  const last = i === items.length - 1;
  const pct = Math.round(((i + 1) / items.length) * 100);

  const pick = (k: number) => {
    if (checked) return;
    setPicked(k);
  };

  const check = () => {
    if (picked === null || checked) return;
    const ms = start.current > 0 ? Math.max(0, Math.round(performance.now() - start.current)) : 0;
    const isCorrect = picked === item.answer;
    setChecked(true);
    if (isCorrect) setCorrectCount((n) => n + 1);
    void fetch("/learner/api/attempt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        blockId: item.id,
        lessonId,
        moduleId,
        choice: picked,
        correct: isCorrect,
        ms,
      }),
      keepalive: true,
    }).catch(() => {
      /* the attempt is best-effort; the player keeps moving */
    });
  };

  const next = () => {
    if (last) setDone(true);
    else {
      setI(i + 1);
      setPicked(null);
      setChecked(false);
    }
  };

  return (
    <div className="lesson-screen">
      <>
      <div className="lbar">
        <Link href="/drill" className="linkish" aria-label="Leave lesson">✕</Link>
        <span className="pbar">
          <i style={{ width: `${pct}%` }} />
        </span>
        <span className="count">{step} · {i + 1} / {items.length}</span>
      </div>

      <span className="tag">{item.level}</span>
      <h2 className="q">{item.prompt}</h2>
      {item.code && (
        <div className="code">
          {item.code.map((line, k) => (
            <span key={k}><span className="ln">{k + 1}</span>{line}</span>
          ))}
        </div>
      )}

      <div className="opts">
        {item.options.map((o, k) => {
          const state = !checked
            ? k === picked ? " sel" : ""
            : k === item.answer ? " good" : k === picked ? " bad" : "";
          return (
            <button key={k} className={"opt" + state} onClick={() => pick(k)}>
              <span className="letter">{"ABCD"[k]}</span>
              <span style={{ fontFamily: o.code ? "var(--font-mono)" : undefined }}>{o.text}</span>
            </button>
          );
        })}
      </div>

      {checked ? (
        <div className={"band " + (correct ? "ok" : "bad")}>
          <b>{correct ? "Correct" : "Not quite"}</b>
          <p>{correct ? item.why : item.wrongWhy}</p>
          <button className="btn" onClick={next}>
            {last ? "Finish lesson" : "Continue"}
          </button>
        </div>
      ) : (
        <div className="band">
          <button className="btn" onClick={check} disabled={picked === null}>
            Check
          </button>
        </div>
      )}
      </>
    </div>
  );
}
