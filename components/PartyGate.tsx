"use client";

import { useState } from "react";
import Link from "next/link";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode(): string {
  const pick = (n: number) =>
    Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
  return pick(3) + "-" + pick(3);
}

type Mode = "choose" | "host" | "join" | "joined";

const SEATS = [
  { name: "You", tag: "Host", you: true },
  { name: "Kai", tag: "Ready" },
  { name: "Mei", tag: "Ready" },
];

export default function PartyGate() {
  const [mode, setMode] = useState<Mode>("choose");
  const [code, setCode] = useState("");
  const [typed, setTyped] = useState("");

  const host = () => {
    setCode(makeCode());
    setMode("host");
  };

  const join = () => {
    const clean = typed.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (clean.length < 6) return;
    setCode(clean.slice(0, 3) + "-" + clean.slice(3));
    setMode("joined");
  };

  if (mode === "choose") {
    return (
      <>
        <div className="hd">
          <div>
            <h1>Boss battle</h1>
            <div className="mod" style={{ marginTop: 4 }}>5 players · 30s a question · 4 lives</div>
          </div>
          <span className="streak">Unit 1 · Mr Eric Chan</span>
        </div>

        <div className="party-grid">
          <button className="party-card" onClick={host}>
            <span className="pc-top">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
                strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </span>
            <b>Create a party</b>
            <span>Get a code, share it with four friends, start when two are in.</span>
          </button>

          <button className="party-card" onClick={() => setMode("join")}>
            <span className="pc-top">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
                strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 4h4v16h-4M10 8l4 4-4 4M14 12H3" />
              </svg>
            </span>
            <b>Join a party</b>
            <span>Type the six-character code your host gave you.</span>
          </button>
        </div>

        <div className="party-note">
          You can also start alone: the empty seats are filled by your other characters.
        </div>
      </>
    );
  }

  if (mode === "join") {
    return (
      <>
        <div className="hd">
          <button className="linkish" onClick={() => setMode("choose")}>← Back</button>
          <span className="mod">Join a party</span>
          <span />
        </div>

        <div className="join-wrap">
          <p className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: ".6px" }}>
            PARTY CODE
          </p>
          <input
            className="code-input"
            value={typed}
            onChange={(e) => setTyped(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && join()}
            placeholder="K4M2PX"
            maxLength={7}
            autoFocus
          />
          <button className="btn" onClick={join} disabled={typed.replace(/[^A-Z0-9]/gi, "").length < 6}>
            Join party
          </button>
          <p className="mono" style={{ fontSize: 9.5, color: "var(--ink-3)", textAlign: "center" }}>
            Ask the host to read it out. Six characters, no spaces.
          </p>
        </div>
      </>
    );
  }

  const joining = mode === "joined";

  return (
    <>
      <div className="hd">
        <button className="linkish" onClick={() => setMode("choose")}>✕</button>
        <span className="mod">{joining ? "You joined" : "Your party"}</span>
        <span className="mod dim">2 of 4</span>
      </div>

      <div className="lobby-code">
        <div>
          <div className="mono" style={{ fontSize: 8.5, letterSpacing: ".9px", color: "#9A9A90" }}>
            {joining ? "PARTY CODE" : "SHARE THIS CODE"}
          </div>
          <div className="code-val">{code}</div>
        </div>
        <button
          className="mono"
          onClick={() => navigator.clipboard?.writeText(code)}
          style={{ fontSize: 10, fontWeight: 700, padding: "6px 10px", border: "3px solid var(--ink)",
            borderRadius: 6, background: "var(--paper)", cursor: "pointer" }}
        >
          Copy
        </button>
      </div>

      <div className="sub" style={{ paddingTop: 18 }}>
        Party · {joining ? "you + 2 friends in" : "you + 2 of 4 friends in"}
      </div>

      <div className="seat-grid">
        {SEATS.map((s) => (
          <div key={s.name} className="seat">
            <span className="av">{s.you ? "You" : s.name.slice(0, 2).toUpperCase()}</span>
            <span className="txt"><b>{s.name}</b><span>{s.tag}</span></span>
          </div>
        ))}
        {[3, 4].map((n) => (
          <div key={n} className="seat open">
            <span className="av">+</span>
            <span className="txt"><b>Friend {n}</b><span>Invite</span></span>
          </div>
        ))}
      </div>

      <div className="lobby-foot">
        <Link href="/party/battle" className="btn"
          style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>
          Start raid
        </Link>
        <p className="mono" style={{ fontSize: 9.5, color: "var(--ink-3)", textAlign: "center", marginTop: 9 }}>
          Five seats, one question each, thirty seconds a round.
        </p>
      </div>
    </>
  );
}
