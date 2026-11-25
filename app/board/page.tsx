import Link from "next/link";
import { redirect } from "next/navigation";
import { getBoard, viewer, type BoardRow } from "@/lib/repo";
import { pool } from "@/lib/db";
import "./board.css";

/* getBoard ranks the class but never returns its size, so the "n/m showed up"
   pill counts the roster here. Same class the board is scoped to. */
async function showCount(userId: string) {
  const { rows } = await pool.query<{ present: number; roster: number }>(
    `with mine as (
       select c.id
         from enrollments e join classes c on c.id = e.class_id
        where e.student_id = $1
        order by e.joined_at desc limit 1
     ),
     showed as (
       select distinct a.user_id
         from attempts a
        where (a.created_at at time zone 'Asia/Hong_Kong')::date
            = (now() at time zone 'Asia/Hong_Kong')::date
     )
     select
       case when (select id from mine) is null
            then (select count(*) from showed)
            else (select count(*) from showed s
                    join enrollments e on e.student_id = s.user_id
                   where e.class_id = (select id from mine))
       end::int as present,
       case when (select id from mine) is null
            then (select count(*) from users where role = 'student')
            else (select count(*) from enrollments e where e.class_id = (select id from mine))
       end::int as roster`,
    [userId],
  );
  const present = Number(rows[0]?.present ?? 0);
  return { present, roster: Math.max(Number(rows[0]?.roster ?? 0), present) };
}

export default async function Board() {
  const v = await viewer();
  if (!v) redirect("/login");

  const [{ rows, className }, showed] = await Promise.all([
    getBoard(v.id),
    showCount(v.id),
  ]);

  /* the podium is always three cards, in the order 2 / 1 / 3 */
  const slots = [1, 0, 2].map((i) => ({ rank: i + 1, row: rows[i] as BoardRow | undefined }));

  const youAt = rows.findIndex((r) => r.you);
  const you = youAt === -1 ? undefined : rows[youAt];
  const ahead = youAt > 0 ? rows[youAt - 1] : undefined;
  const leader = rows[0];
  const trackPct =
    you && leader && leader.items > 0
      ? Math.min(100, Math.round((you.items / leader.items) * 100))
      : 0;
  const tail = rows.slice(3).filter((r) => !r.you);
  const needed = you && ahead ? ahead.items - you.items + 1 : 0;

  return (
    <div className="v-board">
      <div className="bhead">
        <div>
          <h1>Today</h1>
          <p>{className ?? "Everyone"} · Resets 00:00</p>
        </div>
        <span className="stat-pill">
          <b>{showed.present}</b>/{showed.roster} SHOWED UP
        </span>
      </div>

      <div className="podium">
        {slots.map(({ rank, row }) => (
          <div key={rank} className={`pod p${rank}${row ? "" : " is-empty"}`}>
            <span className="num">{rank}</span>
            <span className="nm">{row ? row.name : "—"}</span>
            <span className="val">{row ? row.items : "—"}</span>
          </div>
        ))}
      </div>

      <div className="mecard">
        <div className="mehead">
          <span className="rank">{you ? you.rank : "—"}</span>
          <span className="who">{you?.name ?? v.name} (you)</span>
          <span className="val">{you ? you.items : 0}</span>
        </div>
        <div className="track">
          <i style={{ width: `${trackPct}%` }} />
        </div>
        <div className="gap">
          {!you ? (
            <>Face one item to get on the board.</>
          ) : you.rank === 1 ? (
            <>You lead the board.</>
          ) : ahead ? (
            <>
              {needed} {needed === 1 ? "item" : "items"} to pass <b>{ahead.name}</b>
            </>
          ) : (
            <>You lead the board.</>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="blank">
          <b>No one has answered anything today — be first.</b>
          <Link href="/drill" className="blank-cta">Start a drill</Link>
        </div>
      ) : tail.length > 0 ? (
        <div className="rest">
          {tail.map((r) => (
            <div key={r.rank} className="restrow">
              <span className="r">{String(r.rank).padStart(2, "0")}</span>
              <span className="nm">{r.name}</span>
              <span className="v">{r.items}</span>
            </div>
          ))}
        </div>
      ) : null}

      <p className="board-note">Ranked by items faced · a wrong answer still counts</p>
    </div>
  );
}
