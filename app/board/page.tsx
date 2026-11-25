import Link from "next/link";
import { redirect } from "next/navigation";
import { getBoard, viewer, type BoardRow } from "@/lib/repo";

const label = (r: BoardRow) => (r.you ? `${r.name} (you)` : r.name);

export default async function Board() {
  const v = await viewer();
  if (!v) redirect("/login");

  const { rows, className, presentDay } = await getBoard(v.id);
  const [first, second, third] = rows;
  const podium = [second, first, third].filter((r): r is BoardRow => Boolean(r));
  const rest = rows.slice(3);
  const you = rows.find((r) => r.you);
  const extra = you && you.rank > 3 && !rest.some((r) => r.you) ? [you] : [];

  return (
    <>
      <div className="hd">
        <div>
          <h1>Board</h1>
          <div className="mod" style={{ marginTop: 4 }}>
            {className ?? "Everyone"} · resets 00:00 HKT
          </div>
        </div>
        <span className="streak">{presentDay} active today</span>
      </div>

      {rows.length === 0 ? (
        <>
          <div className="sec"><h2>Today</h2><span>distinct items faced today</span></div>
          <div style={{ padding: "0 16px" }}>
            <div className="empty">
              <b>No one has answered anything today — be first.</b>
              <Link href="/drill" className="btn sm"
                style={{ display: "inline-grid", placeItems: "center", marginTop: 12, textDecoration: "none" }}>
                Start a drill
              </Link>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="podium">
            {podium.map((r) => (
              <div key={r.rank} className={`pod p${r.rank}`}>
                <span className="num">{r.rank}</span>
                <span className="nm">{label(r)}</span>
                <span className="val">{r.items}</span>
              </div>
            ))}
          </div>

          <div className="sec"><h2>Everyone else</h2><span>distinct items faced today</span></div>
          <div className="rows tight">
            {[...rest, ...extra].map((r) => (
              <div
                key={r.rank}
                className="row"
                style={r.you
                  ? { borderColor: "var(--orange)", boxShadow: "3px 3px 0 var(--orange)" }
                  : { boxShadow: "3px 3px 0 var(--line)" }}
              >
                <span className="no" style={{ flex: "0 0 26px", height: 26, borderRadius: 5 }}>{r.rank}</span>
                <span className="txt"><b>{label(r)}</b></span>
                <span className="mono">{r.items}</span>
              </div>
            ))}
            {rest.length === 0 && extra.length === 0 && (
              <div className="empty">
                <p>No one else has answered today.</p>
              </div>
            )}
          </div>
        </>
      )}
      <div style={{ height: 24 }} />
    </>
  );
}
