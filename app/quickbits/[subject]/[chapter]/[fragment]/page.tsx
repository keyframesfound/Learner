import Link from "next/link";
import { chapters, concept, fragments, subjects } from "@/lib/content";

export default async function Concept({ params }: { params: Promise<{ subject: string; chapter: string; fragment: string }> }) {
  const { subject, chapter, fragment } = await params;
  const s = subjects.find((x) => x.id === subject) ?? subjects[0]!;
  const c = chapters.find((x) => x.id === chapter) ?? chapters[0]!;
  const i = fragments.findIndex((f) => f.id === fragment);
  const f = fragments[i] ?? fragments[0]!;
  const next = fragments[i + 1];

  return (
    <>
      <div className="hd">
        <Link href={`/quickbits/${s.id}/${c.id}`} className="linkish">✕</Link>
        <div className="chip-track">
          {fragments.map((x) => (
            <span key={x.id} className={"tick" + (x.no <= f.no ? " on" : "")} />
          ))}
        </div>
        <span className="mod">{f.no} · {fragments.length}</span>
      </div>

      <article className="note">
        <h1>{concept.title}</h1>
        {concept.body.map((p) => <p key={p.slice(0, 20)}>{p}</p>)}

        <table className="cmp">
          <thead>
            <tr><th />{concept.table.head.map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {concept.table.rows.map((r) => (
              <tr key={r[0]}>
                <th>{r[0]}</th>
                {r.slice(1).map((cell, k) => <td key={k}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>

        <aside className="callout">
          <b>Exam</b>
          <span>{concept.callout}</span>
        </aside>
      </article>

      <div className="note-foot">
        {next ? (
          <Link href={`/quickbits/${s.id}/${c.id}/${next.id}`} className="btn"
            style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>
            Next · {next.title}
          </Link>
        ) : (
          <Link href={`/quickbits/${s.id}/${c.id}`} className="btn"
            style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>
            Chapter done
          </Link>
        )}
      </div>
    </>
  );
}
