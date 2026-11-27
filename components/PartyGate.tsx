"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PartyView, RaidSource } from "@/lib/party";
import { BOSSES, bossById, bossLine } from "@/lib/bosses";

const API = "/learner/api/party";
const SEATS = 5;
const FRIEND_SEATS = SEATS - 1;

function cleanCode(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function display(code: string) {
  return code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]!.slice(0, 1) + parts[parts.length - 1]!.slice(0, 1)).toUpperCase();
}

type Mode = "choose" | "join" | "lobby";

export default function PartyGate({ sources = [] }: { sources?: RaidSource[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [picking, setPicking] = useState(false);
  const [view, setView] = useState<PartyView | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  const [resume, setResume] = useState<PartyView | null>(null);
  const [srcOpen, setSrcOpen] = useState(false);
  const srcBox = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!srcOpen) return;
    const away = (e: MouseEvent) => {
      if (srcBox.current && !srcBox.current.contains(e.target as Node)) setSrcOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSrcOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [srcOpen]);

  /* resume a raid that is already running, or a lobby you are still sitting in */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(API, { cache: "no-store" });
        if (!alive) return;
        if (r.status === 401) { setSignedOut(true); return; }
        if (!r.ok) return;
        const data = (await r.json()) as { party?: PartyView | null };
        const party = data.party;
        if (!alive || !party) return;
        if (party.status === "live") { setResume(party); return; }
        if (party.status !== "lobby") return;
        setView(party);
        setMode("lobby");
      } catch {
        /* the chooser still works offline */
      }
    })();
    return () => { alive = false; };
  }, []);

  /* lobby poll: names appear, and everyone leaves for the arena when the host starts */
  const code = view?.code ?? "";
  const status = view?.status ?? "";
  useEffect(() => {
    if (mode !== "lobby" || !code || status !== "lobby") return;
    const id = setInterval(async () => {
      try {
        const r = await fetch(`${API}/${code}`, { cache: "no-store" });
        if (!r.ok) return;
        const next = (await r.json()) as PartyView;
        setView(next);
        if (next.status !== "lobby") router.push(`/party/battle?code=${next.code}`);
      } catch {
        /* keep the seat list on screen */
      }
    }, 1500);
    return () => clearInterval(id);
  }, [mode, code, status, router]);

  const create = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(API, { method: "POST" });
      if (r.status === 401) { setSignedOut(true); return; }
      const data = (await r.json().catch(() => null)) as PartyView | { error?: string } | null;
      if (!r.ok || !data || !("code" in data)) {
        setError((data && "error" in data && data.error) || "Could not create a party.");
        return;
      }
      setView(data);
      setMode("lobby");
    } catch {
      setError("Could not create a party.");
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const join = useCallback(async () => {
    if (busy) return;
    const wanted = cleanCode(typed);
    if (wanted.length < 6) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`${API}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: wanted }),
      });
      if (r.status === 401) { setSignedOut(true); return; }
      const data = (await r.json().catch(() => null)) as PartyView | { error?: string } | null;
      if (!r.ok || !data || !("code" in data)) {
        setError((data && "error" in data && data.error) || "Could not join that party.");
        return;
      }
      setView(data);
      setMode("lobby");
    } catch {
      setError("Could not join that party.");
    } finally {
      setBusy(false);
    }
  }, [busy, typed]);

  const start = useCallback(async () => {
    if (!view || busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`${API}/${view.code}/start`, { method: "POST" });
      const data = (await r.json().catch(() => null)) as PartyView | { error?: string } | null;
      if (!r.ok || !data || !("code" in data)) {
        setError((data && "error" in data && data.error) || "Could not start the raid.");
        return;
      }
      router.push(`/party/battle?code=${data.code}`);
    } catch {
      setError("Could not start the raid.");
    } finally {
      setBusy(false);
    }
  }, [view, busy, router]);

  /* the host swaps bosses from the lobby, before the first question */
  const changeBoss = useCallback(
    async (id: string) => {
      if (!view || busy) return;
      setBusy(true);
      setError("");
      try {
        const r = await fetch(`${API}/${view.code}/boss`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ boss: id }),
        });
        const data = (await r.json().catch(() => null)) as PartyView | { error?: string } | null;
        if (!r.ok || !data || !("code" in data)) {
          setError((data && "error" in data && data.error) || "Could not change the boss.");
          return;
        }
        setView(data);
        setPicking(false);
      } catch {
        setError("Could not change the boss.");
      } finally {
        setBusy(false);
      }
    },
    [view, busy],
  );

  /* host swaps the class whose questions the raid draws from */
  const changeSource = useCallback(
    async (moduleId: string) => {
      if (!view || busy) return;
      setBusy(true);
      setError("");
      try {
        const r = await fetch(`${API}/${view.code}/source`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ moduleId }),
        });
        const data = (await r.json().catch(() => null)) as PartyView | { error?: string } | null;
        if (!r.ok || !data || !("code" in data)) {
          setError((data && "error" in data && data.error) || "Could not change the class.");
          return;
        }
        setView(data);
      } catch {
        setError("Could not change the class.");
      } finally {
        setBusy(false);
      }
    },
    [view, busy],
  );

  const leave = useCallback(async () => {
    if (!view || busy) return;
    setBusy(true);
    try {
      await fetch(`${API}/${view.code}/leave`, { method: "POST" });
    } catch {
      /* leaving is best-effort; the lobby is gone from this device anyway */
    } finally {
      setView(null);
      setMode("choose");
      setBusy(false);
      setError("");
    }
  }, [view, busy]);

  if (signedOut) {
    return (
      <>
        <div className="hd">
          <div>
            <h1>Boss battle</h1>
            <div className="mod" style={{ marginTop: 4 }}>5 players · your own pace · 4 lives</div>
          </div>
        </div>
        <div className="empty" style={{ margin: 16 }}>
          <b>You are signed out</b>
          <p>Sign in with your school Google account to start a party.</p>
          <Link href="/login" className="btn" style={{ display: "grid", placeItems: "center", textDecoration: "none", marginTop: 14 }}>
            Sign in
          </Link>
        </div>
      </>
    );
  }

  if (mode === "choose") {
    return (
      <>
        <div className="hd">
          <div>
            <h1>Boss battle</h1>
            <div className="mod" style={{ marginTop: 4 }}>5 players · your own pace · 4 lives</div>
          </div>
        </div>

        <div className="party-grid">
          <button className="party-card" onClick={create} disabled={busy}>
            <span className="pc-top">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
                strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </span>
            <b>Create a party</b>
            <span>Get a code, share it with up to four friends, start when they are in.</span>
          </button>

          <button className="party-card" onClick={() => { setMode("join"); setError(""); }} disabled={busy}>
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

        {resume && (
          <div className="party-grid" style={{ paddingTop: 0 }}>
            <Link href={`/party/battle?code=${resume.code}`} className="party-card">
              <span className="pc-top">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 4l13 8-13 8z" />
                </svg>
              </span>
              <b>Raid in progress</b>
              <span>
                Party {display(resume.code)} · question {resume.round} of {resume.total}. Rejoin your friends.
              </span>
            </Link>
          </div>
        )}

        {error && (
          <div className="empty" style={{ margin: 16 }}>
            <b>Could not do that</b>
            <p>{error}</p>
          </div>
        )}

        <div className="party-note">
          Five seats, your own questions, your own pace. The host starts the raid.
        </div>
      </>
    );
  }

  if (mode === "join") {
    const wanted = cleanCode(typed);
    return (
      <>
        <div className="hd">
          <button className="linkish" onClick={() => { setMode("choose"); setError(""); }}>← Back</button>
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
            onChange={(e) => setTyped(cleanCode(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && join()}
            placeholder="K4M2PX"
            maxLength={7}
            autoFocus
          />
          <button className="btn" onClick={join} disabled={busy || wanted.length < 6}>
            Join party
          </button>

          {error && (
            <div className="empty">
              <b>{error}</b>
              <p>Ask the host to read the code again. Six characters, no spaces.</p>
            </div>
          )}

          {!error && (
            <p className="mono" style={{ fontSize: 9.5, color: "var(--ink-3)", textAlign: "center" }}>
              Ask the host to read it out. Six characters, no spaces.
            </p>
          )}
        </div>
      </>
    );
  }

  if (!view) {
    return (
      <>
        <div className="hd">
          <div><h1>Party</h1></div>
        </div>
        <div className="empty" style={{ margin: 16 }}>
          <b>Loading your party…</b>
          <p>Give it a second.</p>
        </div>
      </>
    );
  }

  const host = view.host;
  const inLobby = view.status === "lobby";
  const me = view.players.find((p) => p.you) ?? view.players[0];
  const others = view.players.filter((p) => p !== me);
  const open = Math.max(0, FRIEND_SEATS - (view.players.length - 1));
  const friendsIn = Math.max(0, view.players.length - 1);

  return (
    <div className="v-party">
      <div className="lbar">
        <button className="x" onClick={leave} disabled={busy} aria-label="Leave party">✕</button>
        <span className="count">Party · {display(view.code)}</span>
        <span className="timer">{friendsIn} of {FRIEND_SEATS}</span>
      </div>

      <div className="preview">
        <div dangerouslySetInnerHTML={{ __html: bossById(view.boss).sprite }} />
        <div className="pv-body">
          <h1>{bossById(view.boss).name}</h1>
          <span>{bossLine(bossById(view.boss))}</span>
        </div>
        {host && inLobby ? (
          <button
            className="pv-change"
            onClick={() => setPicking((p) => !p)}
            disabled={busy}
            aria-expanded={picking}
            title="Fight a different boss"
          >
            {picking ? "Cancel" : "Change"}
          </button>
        ) : null}
      </div>

      <div className="sourcebar" ref={srcBox}>
        <span className="sl">Questions from</span>
        {host && inLobby && sources.length > 0 ? (
          <>
            <button
              type="button"
              className="src-pick"
              aria-haspopup="menu"
              aria-expanded={srcOpen}
              aria-label={`Questions from: ${view.moduleLabel ?? "choose a class"}`}
              disabled={busy}
              onClick={() => setSrcOpen((v) => !v)}
            >
              <b>{view.moduleLabel ?? "Choose a class"}</b>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={srcOpen ? "M6 14.5 12 8.5l6 6" : "M6 9.5 12 15.5l6-6"} />
              </svg>
            </button>
            {srcOpen ? (
              <div className="src-menu" role="menu" aria-label="Classes you can raid">
                {sources.map((s) => {
                  const on = view.moduleLabel === s.label;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={on}
                      className={on ? "on" : ""}
                      onClick={() => {
                        setSrcOpen(false);
                        if (!on) void changeSource(s.id);
                      }}
                    >
                      <span>{s.label}</span>
                      <em>{s.questions}</em>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </>
        ) : (
          <span className="sv">{view.moduleLabel ?? "—"}</span>
        )}
      </div>

      {picking && host && inLobby ? (
        <div className="boss-row pick" role="radiogroup" aria-label="Choose your boss">
          {BOSSES.map((b) => (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={view.boss === b.id}
              className={`boss-card b-${b.id}` + (view.boss === b.id ? " on" : "")}
              onClick={() => void changeBoss(b.id)}
              disabled={busy}
            >
              <span className="bc-art" dangerouslySetInnerHTML={{ __html: b.sprite }} />
              <span className="bc-body">
                <b>{b.name}</b>
                <i>{bossLine(b)}</i>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="codebar">
        <div>
          <span className="cl">Party code</span>
          <span className="cv">{display(view.code)}</span>
        </div>
        <button
          className="copy"
          onClick={() => { void navigator.clipboard?.writeText(display(view.code)).catch(() => undefined); }}
        >
          Copy
        </button>
      </div>

      <div className="plabel">Party · you + {friendsIn} of {FRIEND_SEATS} friends in</div>

      <div className="slots">
        {me && (
          <div className="slot me">
            <span className="av">YOU</span>
            <div>
              <b>{me.name}</b>
              <i>{host ? "Host · this is your code to share" : "You"}</i>
            </div>
          </div>
        )}
        {others.map((p, i) => (
          <div key={`${p.name}-${i}`} className="slot">
            <span className="av">{initials(p.name)}</span>
            <div>
              <b>{p.name}</b>
              <i>Ready</i>
            </div>
          </div>
        ))}
        {Array.from({ length: open }, (_, i) => (
          <div key={`open-${i}`} className="slot empty">
            <span className="av">+</span>
            <div>
              <b>Friend {friendsIn + i + 1}</b>
              <i>Invite</i>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="empty">
          <b>{error}</b>
          <p>Try again, or start a fresh party.</p>
        </div>
      )}

      <div className="lobbyfoot">
        {!inLobby ? (
          <Link href={`/party/battle?code=${view.code}`} className="btn">
            Enter the arena
          </Link>
        ) : host ? (
          <button className="btn" onClick={start} disabled={busy}>
            Start raid
          </button>
        ) : (
          <button className="btn" disabled>
            Waiting for the host
          </button>
        )}
        <p className="note">
          Friends join with the code above. Five seats, your own questions, your own pace.
        </p>
      </div>
    </div>
  );
}
