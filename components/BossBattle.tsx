"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CHIBI_HEROES as HEROES } from "@/lib/chibi";
import { bossById } from "@/lib/bosses";
import type { PartyView } from "@/lib/party";
import "@/app/party/boss.css";

const API = "/learner/api/party";
const LIVES = 4;
const PIP_HP = 10;
const REVEAL_MS = 900;

type Reveal = {
  round: number;
  q: string;
  a: string[];
  c: number;
  choice: number | null;
};

type Sticker = { id: number; text: string; side: "boss" | "party"; at: number };
type Hero = (typeof HEROES)[number];

function display(code: string) {
  return code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

function heroAt(i: number): Hero {
  return HEROES[i % HEROES.length] ?? HEROES[0]!;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
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
  const [bossHit, setBossHit] = useState(0);
  const [bossHitAt, setBossHitAt] = useState(0);
  const [lastHit, setLastHit] = useState(0);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [pending, setPending] = useState<number | null>(null);
  const [strikeAt, setStrikeAt] = useState(0);
  const [counterAt, setCounterAt] = useState(0);

  const before = useRef<PartyView | null>(null);
  const lastReveal = useRef(0);
  const seq = useRef(0);

  const pushSticker = useCallback((text: string, side: Sticker["side"]) => {
    const at = Date.now();
    const id = seq.current++;
    setStickers((list) => [...list.filter((s) => at - s.at < 1100), { id, text, side, at }]);
  }, []);

  /**
   * Read the strike off two consecutive views: the boss loses a pip for every
   * correct answer the party banked, and every player whose lives fell took a hit.
   */
  const applyDelta = useCallback(
    (previous: PartyView, next: PartyView) => {
      const lost: string[] = [];
      if (previous.status === "lobby" || next.status === "lobby") return lost;

      const hurt: number[] = [];
      next.players.forEach((player, i) => {
        const old = previous.players[i];
        if (old && player.lives < old.lives) {
          hurt.push(i);
          lost.push(player.name);
        }
      });
      if (hurt.length > 0) {
        setHits((h) => {
          const copy = { ...h };
          for (const i of hurt) copy[i] = (copy[i] ?? 0) + 1;
          return copy;
        });
        setLastHit(Date.now());
        pushSticker("-1 life", "party");
      }

      const oldScore = previous.players.reduce((n, p) => n + p.score, 0);
      const newScore = next.players.reduce((n, p) => n + p.score, 0);
      if (newScore > oldScore) {
        /* the HP bar already shows the damage; no floating number needed */
        setBossHit((s) => s + 1);
        setBossHitAt(Date.now());
      }
      return lost;
    },
    [pushSticker],
  );

  /* the poll is the only source of truth; no local game simulation */
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
        applyDelta(previous, next);
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
  }, [code, applyDelta]);

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

  const answer = useCallback(
    async (choice: number) => {
      if (!view || pending !== null) return;
      if (view.status !== "live" || !view.you.alive) return;
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
        applyDelta(view, data);
        if (data.previous) {
          if (data.previous.choice !== null && data.previous.choice === data.previous.c) setStrikeAt(Date.now());
          else setCounterAt(Date.now());
        }
        if (data.previous && data.previous.round > lastReveal.current) {
          lastReveal.current = data.previous.round;
          setReveal(data.previous);
          setRevealUntil(Date.now() + REVEAL_MS);
        }
        before.current = data;
        setView(data);
      } catch {
        setError("Could not send that answer.");
        void poll();
      } finally {
        setPending(null);
      }
    },
    [view, pending, poll, applyDelta],
  );

  if (fatal) {
    const copy =
      fatal === "signed-out"
        ? { title: "You are signed out", body: "Sign in with your school Google account and rejoin the party." }
        : fatal === "denied"
          ? { title: "You are not in this party", body: "This code belongs to a raid you have not joined." }
          : { title: "That code does not exist", body: "Check the six characters the host read out." };
    return (
      <div className="v-boss">
        <div className="vb-top">
          <Link href="/party" className="vb-x" aria-label="Back to parties">✕</Link>
          <span>Boss battle</span>
        </div>
        <div className="vb-note">
          <b>{copy.title}</b>
          <p>{copy.body}</p>
          <Link href={fatal === "signed-out" ? "/login" : "/party"} className="vb-cta">
            {fatal === "signed-out" ? "Sign in" : "Back to parties"}
          </Link>
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="v-boss">
        <div className="vb-top">
          <Link href="/party" className="vb-x" aria-label="Back to parties">✕</Link>
          <span>Boss battle · {display(code)}</span>
        </div>
        <div className="vb-note">
          <b>Loading the raid…</b>
          <p>Joining party {display(code)}.</p>
        </div>
      </div>
    );
  }

  if (view.status === "lobby") {
    return (
      <div className="v-boss">
        <div className="vb-top">
          <Link href="/party" className="vb-x" aria-label="Back to parties">✕</Link>
          <span>Boss battle · lobby</span>
        </div>
        <div className="vb-note">
          <b>The host has not started yet</b>
          <p>
            Party {display(view.code)} · {view.players.length} of 5 in. Keep this screen open — the raid
            begins on the host&apos;s word.
          </p>
        </div>
        <div className="vb-seats">
          {view.players.map((p, i) => (
            <div key={`${p.name}-${i}`} className={"vb-seat" + (p.you ? " is-you" : "")}>
              <span className="vb-av">{p.you ? "YOU" : p.name.trim().slice(0, 2).toUpperCase()}</span>
              <div>
                <b>{p.name}</b>
                <i>{p.you ? "You" : "Ready"}</i>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const seats = view.players.length;
  const meIndex = Math.max(0, view.players.findIndex((p) => p.you));
  const hero = heroAt(meIndex);
  const me = view.you;
  const up = view.players.filter((p) => p.alive).length;
  const survivors = up;
  const done = view.status === "done";

  const boss = bossById(view.boss);
  const bossMax = boss.pips * PIP_HP;
  const totalCorrect = view.players.reduce((n, p) => n + p.score, 0);
  const bossHp = Math.max(0, bossMax - totalCorrect * PIP_HP);
  const bossPips = Math.ceil(bossHp / PIP_HP);
  /* the boss is beaten: stars over the head, then he goes down */
  const bossDown = done && bossHp === 0;

  /* the clock on the question is the server's: it counts DOWN from
     roundEndsAt, so a reload or a slow tab cannot buy more time */
  const serverNow = now + skew;
  const deadline = view.roundEndsAt ? Date.parse(view.roundEndsAt) : null;
  const remaining = deadline === null ? 0 : Math.max(0, deadline - serverNow);
  const secsLeft = Math.ceil(remaining / 1000);
  const clock = `${Math.floor(secsLeft / 60)}:${String(secsLeft % 60).padStart(2, "0")}`;
  const urgent = deadline !== null && remaining > 0 && remaining <= 5_000;
  const timedOut =
    deadline !== null && remaining === 0 && !view.you.answered && view.you.alive && !done;
  const frac = view.total > 0 ? Math.min(1, view.round / view.total) : 0;

  const settled = !done && reveal && now < revealUntil ? reveal : null;
  const options = settled ? settled.a : view.question?.a ?? [];
  const chosen = settled ? settled.choice : pending ?? me.choice;
  const promptMarkup = settled ? settled.q : view.question?.q ?? "";
  const canTap =
    !settled && !done && me.alive && pending === null && !!view.question && !timedOut;

  const phase2 = !done && bossHp > 0 && bossHp <= bossMax / 2;
  const impact = now - bossHitAt < 300;
  /* a cleared boss outranks a wiped party: the raid was won */
  const title = bossHp === 0 ? "Boss cleared" : survivors === 0 ? "Party down" : "Raid over";

  return (
    <div className="v-boss">
      <div className="vb-top">
        <Link href="/party" className="vb-x" aria-label="Leave the raid">✕</Link>
        <span>
          Boss battle · Question <b>{view.round}</b> · <b>{me.score}</b> correct
        </span>
      </div>

      <div
        className={
          "vb-arena" +
          (now - lastHit < 400 ? " vb-shake" : "") +
          (impact ? " vb-impact" : "") +
          (phase2 ? " is-phase2" : "") +
          (done ? " is-over" : "")
        }
      >
        {phase2 ? <span className="vb-embers" aria-hidden="true" /> : null}
        <div className="vb-status vb-status-boss">
          <div className="vb-row">
            <span className="vb-name">{boss.name}</span>
            <span className="vb-level">{(view.moduleLabel ?? "Boss").split(" · ")[0]}</span>
          </div>
          <div className="vb-hpline">
            <div className="vb-pips">
              {Array.from({ length: boss.pips }, (_, i) => (
                <i key={i} className={"vb-pip" + (i >= bossPips ? " is-gone" : "")} />
              ))}
            </div>
          </div>
          <div className="vb-num">HP {bossHp} / {bossMax}</div>
        </div>

        <div
          className={
            "vb-actor vb-boss-actor" +
            (bossDown ? " is-downed" : "") +
            (now - counterAt < 520 ? " vb-strike-back" : "")
          }
        >
          {bossDown && (
            <span className="vb-stars" aria-hidden="true">
              <i>✦</i>
              <i>✧</i>
              <i>✦</i>
            </span>
          )}
          <div
            key={bossHit}
            className={"vb-art" + (bossHit > 0 && !bossDown ? " vb-hurt" : "")}
            dangerouslySetInnerHTML={{ __html: boss.sprite }}
          />
        </div>

        <div className="vb-party">
          {view.players.map((p, i) => {
            const heroI = heroAt(i);
            const hit = hits[i] ?? 0;
            return (
              <div
                key={`${p.name}-${i}`}
                className={
                  "vb-slot" +
                  (p.alive ? "" : " is-down") +
                  (p.you && p.alive ? " is-you" : "") +
                  (p.you && now - strikeAt < 620 ? " vb-strike" : "")
                }
              >
                {p.you && <span className="vb-hyou">YOU</span>}
                <span className="vb-hlife">
                  {Array.from({ length: LIVES }, (_, k) => (
                    <i key={k} className={k >= p.lives ? "is-off" : undefined} />
                  ))}
                </span>
                <span className="vb-hname">{firstName(p.name)}</span>
                <div className="vb-actor">
                  <div
                    key={`${i}-${hit}`}
                    className={"vb-art" + (hit > 0 ? " vb-hurt" : "")}
                    dangerouslySetInnerHTML={{ __html: heroI.svg }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="vb-status vb-status-party">
          <div className="vb-row">
            <span className="vb-name">You · {hero.name}</span>
            <span className="vb-level">{seats} {seats === 1 ? "seat" : "seats"}</span>
          </div>
          <div className="vb-hpline">
            <span className="vb-tag">♥</span>
            <div className="vb-pips">
              {Array.from({ length: LIVES }, (_, i) => (
                <i key={i} className={"vb-pip" + (i >= me.lives ? " is-gone" : "")} />
              ))}
            </div>
          </div>
          <div className="vb-num">
            {up} of {seats} up · {me.lives} / {LIVES} lives
          </div>
        </div>

        {stickers
          .filter((s) => now - s.at < 1100)
          .map((s) => (
            <span
              key={s.id}
              className={"vb-sticker " + (s.side === "boss" ? "vb-sticker-boss" : "vb-sticker-party")}
            >
              {s.text}
            </span>
          ))}

        {now - lastHit < 350 && <div key={lastHit} className="vb-flash" />}
        {phase2 && !done ? <div className="vb-phase">Phase 2 · he is taking it personally</div> : null}

        {done && (
          <div className={"vb-banner" + (survivors === 0 ? " is-down" : "")}>
            <h2>{title}</h2>
            <p>
              {bossHp === 0
                ? `${boss.name} is down · ${totalCorrect} correct answers in ${view.round} questions`
                : `Question ${view.round} of ${view.total} · ${survivors} of ${seats} still standing`}
            </p>
            <Link href="/party" className="vb-btn">Back to the lobby</Link>
          </div>
        )}
      </div>

      <div className="vb-panel">
        <div className="vb-dialog">
          <div className="vb-meta">
            <span>
              {settled ? (
                settled.choice === null ? (
                  <span>Question {settled.round} settled</span>
                ) : settled.choice === settled.c ? (
                  <b className="vb-t">Correct</b>
                ) : (
                  <b className="vb-miss">Not quite</b>
                )
              ) : !me.alive ? (
                <span>Spectating · {up} of {seats} still up</span>
              ) : (
                <span>
                  <b className="vb-t">Question {view.round} of {view.total}</b> · you are {hero.name}
                </span>
              )}
            </span>
            <b className={"vb-clock" + (urgent ? " is-urgent" : timedOut ? " is-out" : "")}>
              {clock}
            </b>
          </div>
          <div className="vb-tbar">
            <i
              style={{
                width: `${frac * 100}%`,
                background: "var(--lime)",
              }}
            />
          </div>
          {promptMarkup ? (
            <p className="vb-prompt" dangerouslySetInnerHTML={{ __html: promptMarkup }} />
          ) : (
            <p className="vb-say">{done ? "The raid is over." : "Preparing the next question…"}</p>
          )}
        </div>

        {done ? null : me.alive ? (
          options.length > 0 ? (
            <div className={"vb-answers" + (settled ? " is-waiting" : "")}>
              {options.map((text, i) => {
                let cls = "vb-answer";
                if (settled) {
                  if (i === settled.c) cls += " is-right";
                  else if (i === settled.choice) cls += " is-wrong";
                } else if (chosen === i) {
                  cls += " is-picked";
                }
                return (
                  <button
                    key={i}
                    type="button"
                    className={cls}
                    disabled={!canTap}
                    onClick={() => { void answer(i); }}
                  >
                    <span className="vb-letter">{"ABCD".charAt(i)}</span>
                    <span className="vb-txt" dangerouslySetInnerHTML={{ __html: text }} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="vb-spectate">
              <b>Waiting…</b>
              <span>The next question is on its way.</span>
            </div>
          )
        ) : (
          <div className="vb-spectate">
            <b>You are out</b>
            <span>
              The party fights on without you · {up} of {seats} still up
            </span>
          </div>
        )}

        {error && <div className="vb-hint is-err">{error}</div>}

        <div className="vb-hint">
          {done
            ? "Party over · back to the lobby for another run"
            : !me.alive
              ? "The party is still fighting · you are watching"
              : settled
                ? "Next question coming up…"
                : timedOut
                  ? "Time's up on that one · the raid moves you on"
                  : "Tap an answer · 30 seconds on the clock"}
        </div>
      </div>
    </div>
  );
}
