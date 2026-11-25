"use client";

import { useState } from "react";
import Link from "next/link";
import { item } from "@/lib/content";

export default function ItemPlayer({ lesson }: { lesson: string }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === item.answer;

  return (
    <>
      <div className="hd">
        <Link href="/drill" className="mono" style={{ fontSize: 15, textDecoration: "none", color: "inherit" }}>✕</Link>
        <div style={{ flex: 1, height: 11, border: "3px solid var(--ink)", borderRadius: 999,
          background: "var(--paper)", margin: "0 10px", overflow: "hidden" }}>
          <div style={{ width: "60%", height: "100%", background: "var(--lime)" }} />
        </div>
        <span className="mod">03 · 4 / 6</span>
      </div>

      <span className="tag">{item.level}</span>
      <h2 className="q">{item.prompt}</h2>
      <div className="code">{item.code}</div>

      <div className="opts">
        {item.options.map((o, i) => {
          const state = !answered ? "" : i === item.answer ? " good" : i === picked ? " bad" : "";
          return (
            <button key={o.text} className={"opt" + state} onClick={() => !answered && setPicked(i)}>
              <span className="letter">{"ABCD"[i]}</span>
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
          <Link href={`/drill/${lesson}`} className="btn" style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>
            Continue
          </Link>
        </div>
      )}
    </>
  );
}
