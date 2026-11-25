import Link from "next/link";
import { redirect } from "next/navigation";
import { getBoard, viewer, type BoardRow } from "@/lib/repo";

export default async function Board() {
  const v = await viewer();
  if (!v) redirect("/login");

  const { rows, className, presentDay } = await getBoard(v.id);
  const [first, second, third] = rows;
  const podium = [second, first, third].filter((r): r is BoardRow => Boolean(r));
  const rest = rows.slice(3);

  const youAt = rows.findIndex((r) => r.you);
  const you = youAt === -1 ? undefined : rows[youAt];
  const ahead = youAt > 0 ? rows[youAt - 1] : undefined;
  const leader = rows[0];
  const trackPct = you && leader && leader.items > 0
    ? Math.min(100, Math.round((you.items / leader.items) * 100))
    : 0;

  return (
    <>
      <div className="bhead">
        <div>
          <h1>Today</h1>
          <p>{className ?? "Everyone"} · resets 00:00 HKT</p>
        </div>
        <span className="showed">{presentDay} active today</span>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: "16px 18px 0" }}>
          <div className="empty">
            <b>No one has answered anything today — be first.</b>
            <Link href="/drill" className="btn sm"
              style={{ display: "inline-grid", placeItems: "center", marginTop: 12, textDecoration: "none" }}>
              Start a drill
            </Link>
          </div>
        </div>
      ) : (
        <div className="podium">
          {podium.map((r) => (
            <div key={r.rank} className={`pod p${r.rank}`}>
              <span className="num">{r.rank}</span>
              <span className="nm">{r.name}</span>
              <span className="val">{r.items}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mecard">
        <div className="mehead">
          <span className="rank">{you ? you.rank : "—"}</span>
          <span className="who">{you?.name ?? v.name} (you)</span>
          <span className="val">{you ? you.items : "—"}</span>
        </div>
        <div className="track"><i style={{ width: `${trackPct}%` }} /></div>
        <div className="gap">
          {!you ? (
            <>Face one item to get on the board.</>
          ) : ahead ? (
            <>{ahead.items - you.items + 1} items to pass <b>{ahead.name}</b></>
          ) : second && second.items < you.items ? (
            <>You are {you.items - second.items} ahead of <b>{second.name}</b></>
          ) : second ? (
            <>Level with <b>{second.name}</b> on {you.items} items</>
          ) : (
            <>You lead the board.</>
          )}
        </div>
      </div>

      {rest.length > 0 && (
        <div className="rest">
          {rest.map((r) => (
            <div key={r.rank} className="restrow">
              <span className="r">{String(r.rank).padStart(2, "0")}</span>
              <span className="nm">{r.name}</span>
              <span className="v">{r.items}</span>
            </div>
          ))}
        </div>
      )}

      <p className="board-note">Ranked by <b>items faced</b>. A wrong answer still counts.</p>

      <div style={{ height: 24 }} />
    </>
  );
}
