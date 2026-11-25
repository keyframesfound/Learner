import { profile, subjects } from "@/lib/content";

export default function Me() {
  const stats = [
    ["Streak", profile.streak + " days"],
    ["Items today", String(profile.itemsToday)],
    ["Coverage", `${profile.coverage} of ${profile.coverageTotal}`],
    ["To DSE", profile.daysToDse + " days"],
  ];
  return (
    <>
      <div className="hd">
        <div>
          <h1>{profile.name}</h1>
          <div className="mod" style={{ marginTop: 4 }}>{profile.form} · ICT</div>
        </div>
      </div>

      <div className="sec"><h2>This week</h2><span>honest numbers only</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, padding: "0 16px" }}>
        {stats.map(([k, v]) => (
          <div key={k} style={{ border: "3px solid var(--ink)", borderRadius: 9, background: "#fff",
            padding: "11px 12px", boxShadow: "4px 4px 0 var(--line)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: "-.8px" }}>{v}</div>
            <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-3)", marginTop: 4 }}>{k}</div>
          </div>
        ))}
      </div>

      <div className="sec"><h2>Familiarity</h2><span>where each subject sits</span></div>
      <div className="rows">
        {subjects.slice(0, 3).map((s, i) => (
          <div key={s.id} className="row" style={{ boxShadow: "3px 3px 0 var(--line)" }}>
            <span className="mk" style={{ background: s.colour, width: 28, height: 28, borderRadius: 6,
              display: "grid", placeItems: "center" }}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="#fff"><path d={s.d} /></svg>
            </span>
            <span className="txt"><b>{s.name}</b><span>{["Smooth · 5 of 6 chapters", "Cold · not started", "Rough · 2 chapters"][i]}</span></span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", padding: "18px 16px 0" }}>
        <a href="/learner/login" className="btn" style={{ textAlign: "center", textDecoration: "none",
          display: "grid", placeItems: "center" }}>Sign in</a>
      </div>
      <div style={{ height: 24 }} />
    </>
  );
}
