import { board } from "@/lib/content";

export default function Board() {
  const [first, second, third, ...rest] = board;
  return (
    <>
      <div className="hd">
        <div>
          <h1>Today</h1>
          <div className="mod" style={{ marginTop: 4 }}>4B · resets 00:00 HKT</div>
        </div>
        <span className="streak">14 / 18 showed up</span>
      </div>

      <div className="podium">
        <div className="pod p2"><span className="num">2</span><span className="nm">{second?.name}</span><span className="val">{second?.items}</span></div>
        <div className="pod p1"><span className="num">1</span><span className="nm">{first?.name}</span><span className="val">{first?.items}</span></div>
        <div className="pod p3"><span className="num">3</span><span className="nm">{third?.name}</span><span className="val">{third?.items}</span></div>
      </div>

      <div className="sec"><h2>Everyone else</h2><span>distinct items faced today</span></div>
      <div className="rows tight">
        {rest.map((r) => (
          <div key={r.rank} className="row" style={{ boxShadow: "3px 3px 0 var(--line)" }}>
            <span className="no" style={{ flex: "0 0 26px", height: 26, borderRadius: 5 }}>{r.rank}</span>
            <span className="txt"><b>{r.name}</b></span>
            <span className="mono">{r.items}</span>
          </div>
        ))}
      </div>
      <div style={{ height: 24 }} />
    </>
  );
}
