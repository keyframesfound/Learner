import Link from "next/link";
import { notFound } from "next/navigation";
import MarkRead from "@/components/MarkRead";
import { chapters, concept, fragments, subjects } from "@/lib/content";
import { getReads, viewer } from "@/lib/repo";

export default async function Concept({
  params,
}: {
  params: Promise<{ subject: string; chapter: string; fragment: string }>;
}) {
  const { subject, chapter, fragment } = await params;
  const s = subjects.find((x) => x.id === subject);
  const c = chapters.find((x) => x.id === chapter);
  if (!s || !c) notFound();

  const list = s.id === "ict" && c.id === "hardware" ? fragments : [];
  const i = list.findIndex((f) => f.id === fragment);
  const f = list[i];
  if (!f) notFound();

  const next = list[i + 1];
  const authored = c.id === "hardware" && f.id === "ddr";

  const v = await viewer();
  const reads = v ? await getReads(v.id) : new Set<string>();
  const read = reads.has(`${c.id}/${f.id}`);

  return (
    <>
      <div className="hd">
        <Link href={`/quickbits/${s.id}/${c.id}`} className="linkish">✕</Link>
        <div className="chip-track">
          {list.map((x) => (
            <span key={x.id} className={"tick" + (reads.has(`${c.id}/${x.id}`) ? " on" : "")} />
          ))}
        </div>
        <span className="mod">{f.no} · {list.length}</span>
      </div>

      {authored ? (
        <>
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

          <div style={{ padding: "16px 16px 0", maxWidth: 460 }}>
            <MarkRead chapter={c.id} fragment={f.id} read={read} />
          </div>
        </>
      ) : (
        <article className="note">
          <h1>{f.title}</h1>
          <p>This note is being written.</p>
        </article>
      )}

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
