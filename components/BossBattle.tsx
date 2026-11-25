"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { bank } from "@/lib/content";
import { HEROES, BOSS_SVG } from "@/lib/sprites";

const YOU = 0;
const LIVES = 4;
const PIPS = 10;
const PIP_HP = 10;
const ROUND_MS = 30_000;

type Q = { topic: string; q: string; options: string[]; correct: number };
type Seat = { lives: number; streak: number };
type Sticker = { id: number; text: string; side: "boss" | "party" } | null;

type Game = {
  boss: number;
  party: Seat[];
  round: number;
  q: Q | null;
  phase: "thinking" | "resolved" | "over";
  picked: number | null;
  showAnswer: boolean;
  note: string;
  noteKind: "" | "ok" | "no";
  outcome: "win" | "lose" | null;
  deadline: number;
  hitHero: number | null;
  bossSeq: number;
  sticker: Sticker;
};

function shuffle<T>(a: T[]): T[] {
  const out = a.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

function pick(last: Q | null): Q {
  let raw = bank[Math.floor(Math.random() * bank.length)]!;
  let guard = 0;
  while (last && raw.q === last.q && guard++ < 8) {
    raw = bank[Math.floor(Math.random() * bank.length)]!;
  }
  const order = shuffle([0, 1, 2, 3]);
  return { topic: raw.topic, q: raw.q, options: order.map((i) => raw.a[i]!), correct: order.indexOf(raw.c) };
}

function fresh(): Game {
  return {
    boss: PIPS,
    party: HEROES.map(() => ({ lives: LIVES, streak: 0 })),
    round: 1,
    q: null,
    phase: "thinking",
    picked: null,
    showAnswer: false,
    note: "",
    noteKind: "",
    outcome: null,
    deadline: 0,
    hitHero: null,
    bossSeq: 0,
    sticker: null,
  };
}

const allDown = (g: Game) => g.party.every((p) => p.lives <= 0);

function begin(g: Game): Game {
  if (g.boss <= 0) return { ...g, phase: "over", outcome: "win" };
  if (allDown(g)) return { ...g, phase: "over", outcome: "lose" };
  const out = g.party[YOU]!.lives <= 0;
  return {
    ...g,
    phase: "thinking",
    q: out ? null : pick(g.q),
    picked: null,
    showAnswer: false,
    note: out ? "You are out. The party fights on without you." : "",
    noteKind: "",
    deadline: Date.now() + ROUND_MS,
  };
}

function resolve(g: Game, choice: number | null): Game {
  if (g.phase !== "thinking" || !g.q) return g;
  const me = g.party[YOU]!;
  const correct = choice !== null && choice === g.q.correct;
  const streak = correct ? me.streak + 1 : 0;
  const crit = correct && streak % 3 === 0;
  const dmg = correct ? (crit ? 2 : 1) : 0;

  const party = g.party.map((p, i) =>
    i === YOU ? { lives: correct ? p.lives : Math.max(0, p.lives - 1), streak } : p,
  );

  return {
    ...g,
    phase: "resolved",
    picked: choice,
    showAnswer: true,
    boss: Math.max(0, g.boss - dmg),
    party,
    note: correct
      ? `${HEROES[YOU]!.name} used ${HEROES[YOU]!.move}${crit ? " — critical!" : ""}`
      : choice === null
        ? "Out of time — the boss strikes."
        : `${HEROES[YOU]!.name} is hit.`,
    noteKind: correct ? "ok" : "no",
    hitHero: correct ? null : YOU,
    bossSeq: correct ? g.bossSeq + 1 : g.bossSeq,
    sticker: {
      id: Date.now(),
      text: correct ? (crit ? `Crit -${dmg * PIP_HP}` : `-${PIP_HP}`) : "-1 life",
      side: correct ? "boss" : "party",
    },
  };
}

function timeUp(g: Game): Game {
  if (g.phase !== "thinking") return g;
  if (g.party[YOU]!.lives <= 0) return next(g);
  return resolve(g, null);
}

function next(g: Game): Game {
  if (g.boss <= 0) return { ...g, phase: "over", outcome: "win" };
  if (allDown(g)) return { ...g, phase: "over", outcome: "lose" };
  return begin({ ...g, round: g.round + 1 });
}

function remote(g: Game, i: number): Game {
  if (g.phase !== "thinking") return g;
  if (g.party[i]!.lives <= 0) return g;
  const good = Math.random() < 0.7;
  const party = g.party.map((p, k) => {
    if (k !== i) return p;
    const streak = good ? p.streak + 1 : 0;
    return { streak, lives: good ? p.lives : Math.max(0, p.lives - 1) };
  });
  const streak = party[i]!.streak;
  const crit = good && streak % 3 === 0;
  const dmg = good ? (crit ? 2 : 1) : 0;
  return {
    ...g,
    boss: Math.max(0, g.boss - dmg),
    party,
    bossSeq: dmg ? g.bossSeq + 1 : g.bossSeq,
    hitHero: good ? null : i,
    sticker: dmg
      ? { id: Date.now(), text: crit ? "Crit -20" : "-10", side: "boss" }
      : { id: Date.now(), text: "-1", side: "party" },
  };
}

export default function BossBattle() {
  const [g, setG] = useState<Game>(fresh);
  const [now, setNow] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setG(begin(fresh()));
    setNow(Date.now());
  }, []);

  /* clock */
  useEffect(() => {
    if (!mounted || g.phase !== "thinking" || g.outcome) return;
    const id = setInterval(() => {
      setNow(Date.now());
      setG((prev) => (prev.phase === "thinking" && Date.now() >= prev.deadline ? timeUp(prev) : prev));
    }, 100);
    return () => clearInterval(id);
  }, [mounted, g.phase, g.outcome]);

  /* the four friends resolve on their own schedule inside the round */
  useEffect(() => {
    if (!mounted || g.phase !== "thinking" || g.outcome) return;
    const ids = g.party
      .map((p, i) => {
        if (i === YOU || p.lives <= 0) return null;
        const at = 2500 + Math.random() * 12000;
        return setTimeout(() => setG((prev) => remote(prev, i)), at);
      })
      .filter((x): x is ReturnType<typeof setTimeout> => x !== null);
    return () => ids.forEach(clearTimeout);
  }, [mounted, g.round, g.phase, g.outcome]);

  /* after a resolve, move on */
  useEffect(() => {
    if (!mounted || g.phase !== "resolved") return;
    const id = setTimeout(() => setG((prev) => next(prev)), 1200);
    return () => clearTimeout(id);
  }, [mounted, g.phase, g.round]);

  /* clear the damage sticker */
  useEffect(() => {
    if (!g.sticker) return;
    const id = setTimeout(() => setG((prev) => ({ ...prev, sticker: null })), 1000);
    return () => clearTimeout(id);
  }, [g.sticker]);

  const answer = useCallback((i: number) => {
    setG((prev) => (prev.phase === "thinking" ? resolve(prev, i) : prev));
  }, []);

  const left = Math.max(0, g.deadline - now);
  const frac = Math.min(1, left / ROUND_MS);
  const out = g.party[YOU]!.lives <= 0;
  const thinking = g.phase === "thinking" && !g.outcome;

  return (
    <div className="bb">
      <div className="bb-top">
        <Link href="/drill" style={{ textDecoration: "none", color: "inherit", fontSize: 14 }}>✕</Link>
        <span>Boss battle · Round {g.round} · Streak {g.party[YOU]!.streak}</span>
      </div>

      <div className="bb-arena">
        <div className="bb-plate boss">
          <div className="row"><span className="nm">Mr Eric Chan</span><span className="lv">Unit 1 boss</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, fontWeight: 700,
              background: "var(--ink)", color: "var(--lime)", padding: "1px 4px", borderRadius: 2 }}>HP</span>
            <span className="pips">
              {Array.from({ length: PIPS }, (_, i) => (
                <i key={i} className={"pip" + (i >= g.boss ? " off" : "")} />
              ))}
            </span>
          </div>
          <div className="num">{g.boss * PIP_HP} / {PIPS * PIP_HP}</div>
        </div>

        <div className="bb-plat boss" />
        <div className="bb-boss">
          <div key={g.bossSeq} className={g.bossSeq ? "hurt" : ""}
            dangerouslySetInnerHTML={{ __html: BOSS_SVG }} />
        </div>

        <div className="bb-plat party" />
        <div className="bb-party">
          {HEROES.map((h, i) => (
            <div key={h.name} className={"bb-slot" + (g.party[i]!.lives <= 0 ? " down" : "")}>
              {i === YOU && <span className="you">You</span>}
              <span className="hp">
                {Array.from({ length: LIVES }, (_, k) => (
                  <i key={k} className={k >= g.party[i]!.lives ? "off" : ""} />
                ))}
              </span>
              <span className="name">{h.name}</span>
              <div key={g.hitHero === i ? "hit" + g.bossSeq : "idle"}
                className={"bb-hero" + (g.hitHero === i ? " hurt" : "")}
                dangerouslySetInnerHTML={{ __html: h.svg }} />
            </div>
          ))}
        </div>

        <div className="bb-plate party">
          <div className="row"><span className="nm">You · {HEROES[YOU]!.name}</span>
            <span className="lv">4 friends</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, fontWeight: 700,
              background: "var(--ink)", color: "var(--lime)", padding: "1px 4px", borderRadius: 2 }}>♥</span>
            <span className="pips">
              {Array.from({ length: LIVES }, (_, i) => (
                <i key={i} className={"pip" + (i >= g.party[YOU]!.lives ? " off" : "")} />
              ))}
            </span>
          </div>
          <div className="num">
            {g.party.filter((p) => p.lives > 0).length} of 5 up · {g.party[YOU]!.lives} / {LIVES} lives
          </div>
        </div>

        {g.sticker && (
          <span key={g.sticker.id} className="bb-sticker"
            style={{
              background: g.sticker.side === "boss" ? "#fff" : "var(--orange)",
              ...(g.sticker.side === "boss"
                ? { right: "24%", top: "22%" }
                : { left: "24%", bottom: "34%" }),
            }}>
            {g.sticker.text}
          </span>
        )}

        {g.outcome && (
          <div className="bb-banner">
            <h2 style={g.outcome === "lose" ? { color: "var(--orange)" } : undefined}>
              {g.outcome === "win" ? "Boss cleared" : "Party down"}
            </h2>
            <p>
              Round {g.round} · {g.outcome === "win"
                ? `${g.party.filter((p) => p.lives > 0).length} of 5 still standing`
                : "out of lives"}
            </p>
            <button className="bb-btn" onClick={() => setG(begin(fresh()))}>
              {g.outcome === "win" ? "Fight again" : "Try again"}
            </button>
          </div>
        )}
      </div>

      <div className="bb-panel">
        <div className="bb-dialog">
          <div className="bb-meta">
            <span>
              {out && thinking ? (
                <span>Spectating · {g.party.filter((p) => p.lives > 0).length} of 5 still up</span>
              ) : g.showAnswer ? (
                g.noteKind === "ok" ? <b style={{ color: "var(--blue)" }}>Correct</b>
                  : <span>Answer: <b style={{ color: "var(--blue)" }}>{g.q?.options[g.q.correct]}</b></span>
              ) : (
                <span><b style={{ color: "var(--blue)" }}>{g.q?.topic}</b> · you are {HEROES[YOU]!.name}</span>
              )}
            </span>
            <b className="bb-clock">{mounted ? `0:${String(Math.ceil(left / 1000)).padStart(2, "0")}` : "0:30"}</b>
          </div>
          <div className="bb-bar">
            <i style={{ width: `${mounted ? frac * 100 : 100}%`,
              background: left <= 10000 ? "var(--orange)" : "var(--lime)" }} />
          </div>
          <p className="bb-say">
            {out && thinking ? "You are out. The party fights on without you."
              : g.phase === "resolved" ? g.note
              : g.q ? <span dangerouslySetInnerHTML={{ __html: g.q.q }} />
              : "Preparing the raid…"}
          </p>
        </div>

        {thinking && g.q && !out ? (
          <div className="bb-answers">
            {g.q.options.map((text, i) => {
              const cls = !g.showAnswer ? "" : i === g.q!.correct ? " right" : i === g.picked ? " wrong" : "";
              return (
                <button key={i} className={"bb-opt" + cls} disabled={!thinking} onClick={() => answer(i)}>
                  <span className="chip">{i + 1}</span>
                  <span className="txt" dangerouslySetInnerHTML={{ __html: text }} />
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ height: 100 }} />
        )}

        <div className="bb-hint">
          {out ? "The party is still fighting · you are watching" : "Tap an answer · 3 in a row = critical hit"}
        </div>
      </div>
    </div>
  );
}
