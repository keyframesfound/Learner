"use client";

import { useState } from "react";
import Link from "next/link";
import { lessonItems } from "@/lib/content";

export default function ItemPlayer({ lesson }: { lesson: string }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const item = lessonItems[i]!;
  const answered = picked !== null;
  const correct = picked === item.answer;
  const last = i === lessonItems.length - 1;

  const next = () => {
    if (last) setDone(true);
    else { setI(i + 1); setPicked(null); }
  };

  if (done) {
    return (
      <div className="note" style={{ paddingTop: 40 }}>
        <h1>Lesson complete</h1>
        <p>Three items answered. The next lesson unlocks on the path.</p>
        <div style={{ display: "grid", gap: 9, marginTop: 18, maxWidth: 420 }}>
          <Link href="/drill" className="btn" style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>
            Back to the path
          </Link>
          <Link href="/party" className="btn ghost" style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>
            Party up for the boss
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="hd">
        <Link href="/drill" className="linkish">✕</Link>
        <div className="chip-track">
          {lessonItems.map((_, k) => <span key={k} className={"tick" + (k <= i ? " on" : "")} />)}
        </div>
        <span className="mod">{i + 1} of {lessonItems.length}</span>
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
          const state = !answered ? "" : k === item.answer ? " good" : k === picked ? " bad" : "";
          return (
            <button key={o.text} className={"opt" + state} onClick={() => !answered && setPicked(k)}>
              <span className="letter">{"ABCD"[k]}</span>
              <span style={{ fontFamily: o.code ? "var(--font-mono)" : undefined }}>{o.text}</span>
            </button>
          );
        })}
      </div>

      <div style={{ height: 24 }} />

      {answered && (
        <div className={"band " + (correct ? "ok" : "bad")}>
          <b>{correct ? "Correct" : "Not quite"}</b>
          <p>{correct ? item.why : item.wrongWhy}</p>
          <button className="btn" onClick={next}>
            {last ? "Finish lesson" : "Continue"}
          </button>
        </div>
      )}
      <span hidden>{lesson}</span>
    </>
  );
}
