import Link from "next/link";
import { redirect } from "next/navigation";
import { isStaff, viewer } from "@/lib/repo";
import { moduleList, trackList } from "@/app/teach/data";
import { createModuleAction } from "@/app/teach/content-actions";
import StartFrom from "@/components/teach/StartFrom";

export default async function NewCurriculumPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const v = await viewer();
  if (!isStaff(v)) redirect("/login");
  const sp = await searchParams;

  const [tracks, modules] = await Promise.all([trackList(), moduleList()]);

  return (
    <section className="screen on" id="newcur">
      <div className="topstrip">
        <Link className="back" href="/teach/curriculum">← Curriculum</Link>
        <span className="div" />
        <span className="autosave">New curriculum</span>
      </div>

      <div className="body">
        <h1>New curriculum</h1>
        <div className="sub">Name it the way students see it: form, then subject</div>

        {tracks.length === 0 ? (
          <div className="newc" style={{ maxWidth: 620, marginTop: 18 }}>
            <div className="lbl">Curriculum</div>
            <div className="thint" style={{ padding: 0 }}>
              No subjects exist yet. A subject (track) has to exist before a curriculum can sit in it.
            </div>
          </div>
        ) : (
          <form action={createModuleAction} className="newc" style={{ maxWidth: 620, marginTop: 18, alignSelf: "flex-start" }}>
            <div className="lbl">Curriculum</div>

            <div className="fl">Name</div>
            <input
              className="fld"
              name="name"
              required
              minLength={3}
              maxLength={60}
              placeholder="F4 Biology"
              aria-label="Name"
            />

            <div className="fl" style={{ marginTop: 4 }}>Subject</div>
            <select className="sel" name="trackId" defaultValue={tracks[0]?.id ?? ""} aria-label="Subject">
              {tracks.map((track) => (
                <option key={track.id} value={track.id}>{track.name}</option>
              ))}
            </select>

            <StartFrom modules={modules.map((m) => ({ id: m.id, name: m.name }))} />

            <div className="hint">
              You own this curriculum. It stays invisible to students until you publish a chapter and attach a class to it.
            </div>

            {sp.error ? (
              <p className="hint" role="alert" style={{ color: "var(--red-ink)" }}>{sp.error}</p>
            ) : null}

            <button type="submit" className="b solid" style={{ marginTop: 2 }}>Create curriculum</button>
            <Link className="rm" href="/teach/curriculum" style={{ alignSelf: "flex-start" }}>Cancel</Link>
          </form>
        )}
      </div>
    </section>
  );
}
