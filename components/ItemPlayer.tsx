"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PlayerItem } from "@/lib/repo";

type Props = {
  items: PlayerItem[];
  lessonId: string;
  moduleId: string;
  lessonTitle: string;
  nextSlug?: string;
  nextTitle?: string;
  lessonNumber?: number;
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
}: Props) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const start = useRef(0);

  useEffect(() => {
    start.current = performance.now();
  }, [i]);

  if (done) {
    return (
      <div className="note" style={{ paddingTop: 40 }}>
        <h1>Lesson complete</h1>
        <p>{lessonTitle} · {correctCount} of {items.length} correct.</p>
        <div style={{ display: "grid", gap: 9, marginTop: 18, maxWidth: 420 }}>
          <Link href="/drill" className="btn" style={btnLink}>
            Back to the path
          </Link>
          {nextSlug && (
            <Link href={`/drill/${nextSlug}`} className="btn ghost" style={btnLink}>
              Next lesson{nextTitle ? `: ${nextTitle}` : ""}
            </Link>
          )}
          <Link href="/party" className="btn ghost" style={btnLink}>
            Party up for the boss
          </Link>
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
  const step = String(lessonNumber ?? 1).padStart(2, "0");

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
  );
}
