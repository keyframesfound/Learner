"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HEROES, BOSS_SVG } from "@/lib/sprites";
import type { PartyView } from "@/lib/party";

const API = "/learner/api/party";
const LIVES = 4;
const PIPS = 10;
const PIP_HP = 10;
const BOSS_HP = PIPS * PIP_HP;
const ROUND_MS = 30_000;
const REVEAL_MS = 1800;

type Reveal = {
  round: number;
  q: string;
  a: string[];
  c: number;
  choice: number | null;
};

type Sticker = { id: number; text: string; side: "boss" | "party" } | null;

function display(code: string) {
  return code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

function heroAt(i: number) {
  return HEROES[i % HEROES.length] ?? HEROES[0]!;
}

export default function BossBattle({ code }: { code: string }) {
  const [view, setView] = useState<PartyView | null>(null);
  const [fatal, setFatal] = useState<"signed-out" | "missing" | "denied" | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [skew, setSkew] = useState(0);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [revealUntil, setRevealUntil] = useState(0);
  const [hits, setHits] = useState<Record<number, number>>({});
  const [bossSeq, setBossSeq] = useState(0);
  const [sticker, setSticker] = useState<Sticker>(null);
  const [pending, setPending] = useState<number | null>(null);

  const before = useRef<PartyView | null>(null);
  const lastReveal = useRef(0);

  const poll = useCallback(async () => {
    try {
      const r = await fetch(`${API}/${code}`, { cache: "no-store" });
      if (r.status === 401) { setFatal("signed-out"); return; }
      if (r.status === 404) { setFatal("missing"); return; }
      if (r.status === 403) { setFatal("denied"); return; }
      if (!r.ok) return;
      const next = (await r.json()) as PartyView;

      setSkew(Date.parse(next.serverTime) - Date.now());
      setError("");
      setView(next);

      const previous = before.current;
      if (!previous) {
        /* a reload mid-raid should not replay an old answer */
        lastReveal.current = next.previous?.round ?? 0;
      } else {
        if (previous.status !== "lobby" && next.status !== "lobby") {
          const hurtIdx: number[] = [];
          next.players.forEach((player, i) => {
            const old = previous.players.find((p) => p.name === player.name && p.you === player.you);
            if (old && player.lives < old.lives) hurtIdx.push(i);
          });
          if (hurtIdx.length > 0) {
            setHits((h) => {
              const copy = { ...h };
              for (const i of hurtIdx) copy[i] = (copy[i] ?? 0) + 1;
              return copy;
            });
            setSticker({ id: Date.now(), text: "-1 life", side: "party" });
          }
          const oldScore = previous.players.reduce((n, p) => n + p.score, 0);
          const newScore = next.players.reduce((n, p) => n + p.score, 0);
          if (newScore > oldScore) {
            setBossSeq((s) => s + 1);
            setSticker({ id: Date.now() + 1, text: `-${(newScore - oldScore) * PIP_HP}`, side: "boss" });
          }
        }
        if (next.previous && next.previous.round > lastReveal.current) {
          lastReveal.current = next.previous.round;
          setReveal(next.previous);
          setRevealUntil(Date.now() + REVEAL_MS);
        }
      }
      before.current = next;
    } catch {
      /* a dropped poll: keep the last known state and try again in a second */
    }
  }, [code]);

  /* the poll is the only source of truth; no local game simulation */
  useEffect(() => {
    void poll();
    const id = setInterval(() => { void poll(); }, 1000);
    return () => clearInterval(id);
  }, [poll]);

  /* smooth countdown, driven by serverTime + roundEndsAt */
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!sticker) return;
    const id = setTimeout(() => setSticker(null), 1100);
    return () => clearTimeout(id);
  }, [sticker]);

  const answer = useCallback(
    async (choice: number) => {
      if (!view || pending !== null) return;
      if (view.status !== "live" || !view.you.alive || view.you.answered) return;
      setPending(choice);
      setError("");
      try {
        const r = await fetch(`${API}/${view.code}/answer`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ choice, round: view.round }),
        });
        if (r.status === 401) { setFatal("signed-out"); return; }
        const data = (await r.json().catch(() => null)) as PartyView | { error?: string } | null;
        if (!r.ok || !data || !("code" in data)) {
          setError((data && "error" in data && data.error) || "Could not send that answer.");
          void poll();
          return;
        }
        if (data.previous && data.previous.round > lastReveal.current) {
          lastReveal.current = data.previous.round;
          setReveal(data.previous);
          setRevealUntil(Date.now() + REVEAL_MS);
        }
        setView(data);
      } catch {
        setError("Could not send that answer.");
        void poll();
      } finally {
        setPending(null);
      }
    },
    [view, pending, poll],
  );

  if (fatal) {
    const copy =
      fatal === "signed-out"
        ? { title: "You are signed out", body: "Sign in with your school Google account and rejoin the party." }
        : fatal === "denied"
          ? { title: "You are not in this party", body: "This code belongs to a raid you have not joined." }
          : { title: "That code does not exist", body: "Check the six characters the host read out." };
    return (
      <div className="bb">
        <div className="bb-top">
          <Link href="/party" style={{ textDecoration: "none", color: "inherit", fontSize: 14 }}>✕</Link>
          <span>Boss battle</span>
        </div>
        <div className="empty" style={{ margin: 24 }}>
          <b>{copy.title}</b>
          <p>{copy.body}</p>
          <Link href={fatal === "signed-out" ? "/login" : "/party"} className="btn"
            style={{ display: "grid", placeItems: "center", textDecoration: "none", marginTop: 14 }}>
            {fatal === "signed-out" ? "Sign in" : "Back to parties"}
          </Link>
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="bb">
        <div className="bb-top">
          <Link href="/party" style={{ textDecoration: "none", color: "inherit", fontSize: 14 }}>✕</Link>
          <span>Boss battle · {display(code)}</span>
        </div>
        <div className="empty" style={{ margin: 24 }}>
          <b>Loading the raid…</b>
          <p>Joining party {display(code)}.</p>
        </div>
      </div>
    );
  }

  if (view.status === "lobby") {
    return (
      <div className="bb">
        <div className="bb-top">
          <Link href="/party" style={{ textDecoration: "none", color: "inherit", fontSize: 14 }}>✕</Link>
          <span>Boss battle · lobby</span>
        </div>
        <div className="empty" style={{ margin: 24 }}>
          <b>The host has not started yet</b>
          <p>
            Party {display(view.code)} · {view.players.length} of 5 in. Keep this screen open — the raid
            begins on the host&apos;s word.
          </p>
        </div>
        <div className="seat-grid" style={{ paddingTop: 4 }}>
          {view.players.map((p, i) => (
            <div key={`${p.name}-${i}`} className="seat">
              <span className="av">{p.you ? "You" : p.name.slice(0, 2).toUpperCase()}</span>
              <span className="txt"><b>{p.name}</b><span>{i === 0 ? "Host" : "Ready"}</span></span>
            </div>
          ))}
        </div>
        <div style={{ height: 20 }} />
      </div>
    );
  }

  const myIndex = Math.max(0, view.players.findIndex((p) => p.you));
  const hero = heroAt(myIndex);
  const me = view.you;
  const up = view.players.filter((p) => p.alive).length;
  const totalCorrect = view.players.reduce((n, p) => n + p.score, 0);
  const bossHp = Math.max(0, BOSS_HP - totalCorrect * PIP_HP);
  const bossPips = Math.ceil(bossHp / PIP_HP);
  const survivors = view.players.filter((p) => p.alive).length;
  const done = view.status === "done";

  const serverNow = now + skew;
  const endsAt = view.roundEndsAt ? Date.parse(view.roundEndsAt) : 0;
  const live = view.status === "live" && endsAt > 0;
  const left = live ? Math.max(0, endsAt - serverNow) : 0;
  const frac = live ? Math.min(1, left / ROUND_MS) : 1;
  const clock = `0:${String(Math.ceil(left / 1000)).padStart(2, "0")}`;

  const showingReveal = !!reveal && now < revealUntil && !done;
  const shown = showingReveal
    ? {
        q: reveal!.q,
        a: reveal!.a,
        c: reveal!.c,
        picked: reveal!.choice,
        resolved: true,
      }
    : {
        q: view.question?.q ?? "",
        a: view.question?.a ?? [],
        c: undefined as number | undefined,
        picked: pending ?? me.choice,
        resolved: false,
      };
  const canTap = !showingReveal && !done && me.alive && !me.answered && pending === null && !!view.question;

  return (
    <div className="bb">
      <div className="bb-top">
        <Link href="/party" style={{ textDecoration: "none", color: "inherit", fontSize: 14 }}>✕</Link>
        <span>Boss battle · Round {view.round} of {view.total} · {me.score} correct</span>
      </div>

      <div className="bb-arena">
        <div className="bb-plate boss">
          <div className="row"><span className="nm">Mr Eric Chan</span><span className="lv">Unit 1 boss</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, fontWeight: 700,
              background: "var(--ink)", color: "var(--lime)", padding: "1px 4px", borderRadius: 2 }}>HP</span>
            <span className="pips">
              {Array.from({ length: PIPS }, (_, i) => (
                <i key={i} className={"pip" + (i >= bossPips ? " off" : "")} />
              ))}
            </span>
          </div>
          <div className="num">{bossHp} / {BOSS_HP}</div>
        </div>

        <div className="bb-plat boss" />
        <div className="bb-boss">
          <div key={bossSeq} className={bossSeq ? "hurt" : ""}
            dangerouslySetInnerHTML={{ __html: BOSS_SVG }} />
        </div>

        <div className="bb-plat party" />
        <div className="bb-party">
          {Array.from({ length: 5 }, (_, i) => {
            const p = view.players[i];
            const down = !p || !p.alive;
            return (
              <div key={i} className={"bb-slot" + (down ? " down" : "")}>
                {p?.you && <span className="you">You</span>}
                {p && down && (
                  <span className="you" style={{ background: "var(--ink)", color: "#fff" }}>Down</span>
                )}
                <span className="hp">
                  {Array.from({ length: LIVES }, (_, k) => (
                    <i key={k} className={k >= (p?.lives ?? 0) ? "off" : ""} />
                  ))}
                </span>
                <span className="name">{p ? p.name.split(" ")[0] : "Open"}</span>
                <div key={`${i}-${hits[i] ?? 0}`} className={"bb-hero" + ((hits[i] ?? 0) > 0 ? " hurt" : "")}
                  dangerouslySetInnerHTML={{ __html: heroAt(i).svg }} />
              </div>
            );
          })}
        </div>

        <div className="bb-plate party">
          <div className="row">
            <span className="nm">You · {hero.name}</span>
            <span className="lv">{up} of {view.players.length} up</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, fontWeight: 700,
              background: "var(--ink)", color: "var(--lime)", padding: "1px 4px", borderRadius: 2 }}>♥</span>
            <span className="pips">
              {Array.from({ length: LIVES }, (_, i) => (
                <i key={i} className={"pip" + (i >= me.lives ? " off" : "")} />
              ))}
            </span>
          </div>
          <div className="num">
            {up} of {view.players.length} up · {me.lives} / {LIVES} lives
          </div>
        </div>

        {sticker && (
          <span key={sticker.id} className="bb-sticker"
            style={{
              background: sticker.side === "boss" ? "#fff" : "var(--orange)",
              ...(sticker.side === "boss"
                ? { right: "24%", top: "22%" }
                : { left: "24%", bottom: "34%" }),
            }}>
            {sticker.text}
          </span>
        )}

        {done && (
          <div className="bb-banner">
            <h2 style={survivors === 0 ? { color: "var(--orange)" } : undefined}>
              {survivors > 0 ? "Boss cleared" : "Party down"}
            </h2>
            <p>Round {view.round} of {view.total} · {survivors} of {view.players.length} survivors</p>
            <div className="table" style={{ width: "100%", maxWidth: 360, textAlign: "left" }}>
              {view.players.map((p, i) => (
                <div key={`${p.name}-${i}`} className="tr">
                  <span>{p.name}{p.you ? " · you" : ""}</span>
                  <span className="mono">
                    {p.score} correct · {p.alive ? `${p.lives} lives` : "down"}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/party" className="bb-btn" style={{ textDecoration: "none" }}>
              Back to the lobby
            </Link>
          </div>
        )}
      </div>

      <div className="bb-panel">
        <div className="bb-dialog">
          <div className="bb-meta">
            <span>
              {showingReveal ? (
                shown.picked !== null && shown.picked === shown.c
                  ? <b style={{ color: "var(--blue)" }}>Correct</b>
                  : <span>Answer: <b style={{ color: "var(--blue)" }}>{shown.a[shown.c ?? 0] ?? ""}</b></span>
              ) : !me.alive ? (
                <span>Spectating · {up} of {view.players.length} still up</span>
              ) : (
                <span><b style={{ color: "var(--blue)" }}>Round {view.round} of {view.total}</b> · you are {hero.name}</span>
              )}
            </span>
            <b className="bb-clock">{live ? clock : "0:00"}</b>
          </div>
          <div className="bb-bar">
            <i style={{ width: `${frac * 100}%`,
              background: left <= 10000 ? "var(--orange)" : "var(--lime)" }} />
          </div>
          <p className="bb-say">
            {done
              ? "The raid is over."
              : showingReveal
                ? shown.picked === null
                  ? me.alive
                    ? "Out of time — the boss strikes."
                    : "The party fights on without you."
                  : shown.picked === shown.c
                    ? `${hero.name} used ${hero.move}.`
                    : `${hero.name} is hit.`
                : !me.alive
                  ? "You are down. The party fights on without you."
                  : shown.q
                    ? <span dangerouslySetInnerHTML={{ __html: shown.q }} />
                    : "Preparing the next question…"}
          </p>
        </div>

        {!done && (
          <div className="bb-answers">
            {shown.a.map((text, i) => {
              let cls = "bb-opt";
              if (shown.resolved) {
                if (i === shown.c) cls += " right";
                else if (i === shown.picked) cls += " wrong";
              }
              const locked = !shown.resolved && shown.picked === i;
              return (
                <button
                  key={i}
                  className={cls}
                  disabled={!canTap}
                  onClick={() => { void answer(i); }}
                  style={locked ? { background: "var(--paper)" } : undefined}
                >
                  <span className="chip">{i + 1}</span>
                  <span className="txt" dangerouslySetInnerHTML={{ __html: text }} />
                </button>
              );
            })}
            {shown.a.length === 0 && <div style={{ height: 100 }} />}
          </div>
        )}

        {error && (
          <div className="mono" style={{ fontSize: 9.5, color: "var(--red-ink)", textAlign: "center" }}>
            {error}
          </div>
        )}

        <div className="bb-hint">
          {done
            ? "Party over · back to the lobby for another run"
            : !me.alive
              ? "The party is still fighting · you are watching"
              : me.answered
                ? "Locked in · waiting for the party"
                : "Tap an answer · 30 seconds a round"}
        </div>
      </div>

      {!me.alive && !done && (
        <div className="band bad">
          <b>You are down — spectating</b>
          <p>The party fights on without you. {up} of {view.players.length} still standing.</p>
        </div>
      )}
    </div>
  );
}
