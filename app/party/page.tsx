import Link from "next/link";

const CODE = "K4M-2PX";

export default function Lobby() {
  const seats = [
    { name: "You", tag: "Host · this is your code to share", me: true, open: false },
    { name: "Kai", tag: "Ready", me: false, open: false },
    { name: "Mei", tag: "Ready", me: false, open: false },
    { name: "Friend 3", tag: "Invite", me: false, open: true },
    { name: "Friend 4", tag: "Invite", me: false, open: true },
  ];

  return (
    <>
      <div className="hd">
        <Link href="/drill" className="mono" style={{ textDecoration: "none", color: "inherit", fontSize: 15 }}>✕</Link>
        <span className="mod">Party · E2C</span>
        <span className="mod dim">2 of 4</span>
      </div>

      <div style={{ margin: "16px 16px 0", border: "3px solid var(--ink)", borderRadius: 10,
        background: "#fff", padding: "12px 14px", boxShadow: "5px 5px 0 var(--ink)",
        display: "flex", alignItems: "center", gap: 12 }}>
        <svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="var(--ink)" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="8" width="16" height="12" rx="3" />
          <path d="M8 8V6a4 4 0 0 1 8 0v2M9 13h.01M15 13h.01" />
        </svg>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: "-.4px" }}>Mr Eric Chan</div>
          <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-3)" }}>Unit 1 boss · 100 HP · 5 players</div>
        </div>
      </div>

      <div style={{ margin: "12px 16px 0", background: "var(--ink)", color: "var(--paper)",
        border: "3px solid var(--ink)", borderRadius: 9, padding: "10px 12px",
        display: "flex", alignItems: "center", gap: 10, boxShadow: "5px 5px 0 var(--orange)" }}>
        <div style={{ flex: 1 }}>
          <div className="mono" style={{ fontSize: 8.5, letterSpacing: ".8px", color: "#9A9A90" }}>Party code</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 21, fontWeight: 700, letterSpacing: 2, color: "var(--lime)" }}>
            {CODE}
          </div>
        </div>
        <button className="mono" style={{ fontSize: 10, fontWeight: 700, padding: "6px 10px",
          border: "3px solid var(--ink)", borderRadius: 6, background: "var(--paper)", cursor: "pointer" }}>
          Copy
        </button>
      </div>

      <div className="sub" style={{ paddingTop: 18 }}>Party · you + 2 of 4 friends in</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, padding: "0 16px" }}>
        <div style={{ gridColumn: "1/-1", border: "3px solid var(--ink)", borderRadius: 8,
          background: "#fff", padding: "9px 11px", boxShadow: "4px 4px 0 var(--ink)",
          display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 30, height: 30, borderRadius: 999, background: "var(--lime)",
            border: "2px solid var(--ink)", display: "grid", placeItems: "center",
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700 }}>You</span>
          <div><b style={{ display: "block", fontSize: 12.5 }}>You</b>
            <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>Host · this is your code to share</span></div>
        </div>

        {seats.slice(1).map((s) => (
          <div key={s.name} style={{ border: s.open ? "3px dashed var(--ink-3)" : "3px solid var(--ink)",
            borderRadius: 8, background: s.open ? "transparent" : "#fff", padding: "9px 11px",
            boxShadow: s.open ? "none" : "4px 4px 0 var(--ink)", display: "flex", alignItems: "center", gap: 9,
            color: s.open ? "var(--ink-3)" : "inherit" }}>
            <span style={{ width: 30, height: 30, borderRadius: 999, border: "2px solid",
              borderStyle: s.open ? "dashed" : "solid", borderColor: s.open ? "var(--ink-3)" : "var(--ink)",
              display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700 }}>
              {s.open ? "+" : s.name.slice(0, 2).toUpperCase()}
            </span>
            <div><b style={{ display: "block", fontSize: 12.5 }}>{s.name}</b>
              <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{s.tag}</span></div>
          </div>
        ))}
      </div>

      <div style={{ margin: "auto 16px 18px" }}>
        <Link href="/party/battle" className="btn"
          style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>
          Start raid
        </Link>
        <p className="mono" style={{ fontSize: 9.5, color: "var(--ink-3)", textAlign: "center", marginTop: 9 }}>
          Friends join with the code above. Five seats, one question each, 30s a round.
        </p>
      </div>
    </>
  );
}
