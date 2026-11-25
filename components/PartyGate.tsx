"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PartyView } from "@/lib/party";
import { ROBOT_SVG } from "@/lib/sprites";

const API = "/learner/api/party";
const SEATS = 5;

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

export default function PartyGate() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [view, setView] = useState<PartyView | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  const [resume, setResume] = useState<PartyView | null>(null);

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
            <div className="mod" style={{ marginTop: 4 }}>5 players · 30s a question · 4 lives</div>
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
            <div className="mod" style={{ marginTop: 4 }}>5 players · 30s a question · 4 lives</div>
          </div>
          <span className="streak">Unit 1 · Mr Eric Chan</span>
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
                Party {display(resume.code)} · round {resume.round} of {resume.total}. Rejoin your friends.
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
          Five seats, one question each, thirty seconds a round. The host starts the raid.
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
  const open = Math.max(0, SEATS - view.players.length);
  const friendsIn = Math.max(0, view.players.length - 1);

  return (
    <>
      <div className="hd">
        <button
          className="linkish"
          onClick={leave}
          disabled={busy}
          aria-label="Leave party"
          style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}
        >
          ✕
        </button>
        <span className="mod">Party · E2C</span>
        <span className="mod dim">{view.players.length} of {SEATS}</span>
      </div>

      <div className="preview">
        <div dangerouslySetInnerHTML={{ __html: ROBOT_SVG }} />
        <div>
          <h1>Segfault</h1>
          <span>Level 3 · 12,000 HP</span>
        </div>
      </div>

      <div className="codebar">
        <div>
          <span className="cl">Party code</span>
          <span className="cv">{display(view.code)}</span>
        </div>
        <button
          className="copy"
          onClick={() => { void navigator.clipboard?.writeText(display(view.code)); }}
        >
          Copy
        </button>
      </div>

      <div className="plabel">Party · {view.players.length} of {SEATS} ready</div>

      <div className="slots">
        {me && (
          <div className="slot me" style={{ gridColumn: "span 2" }}>
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
        <div className="empty" style={{ margin: "14px 18px 0" }}>
          <b>{error}</b>
          <p>Try again, or start a fresh party.</p>
        </div>
      )}

      <div className="lobbyfoot">
        {!inLobby ? (
          <Link href={`/party/battle?code=${view.code}`} className="btn"
            style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>
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
        <p className="note">Anyone with the code can join until the first item.</p>
      </div>
    </>
  );
}
