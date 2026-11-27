import Link from "next/link";
import { subjects } from "@/lib/content";

/* The mockup shows every subject across the top, not just the ones with content.
   A subject without a published module simply lands on an empty path. */
export default function SubjectChips({ activeTrack, only }: { activeTrack: string; only?: string[] }) {
  /* a chip is a promise of something to drill: show only the subjects this
     student's classes actually run, plus whatever is on screen already */
  const shown = only ? subjects.filter((s) => only.includes(s.id)) : subjects;
  return (
    <div className="subs">
      {shown.map((s) => (
        <Link
          key={s.id}
          href={s.id === activeTrack ? "/drill" : `/drill?t=${s.id}`}
          className={"chip" + (s.id === activeTrack ? " on" : "")}
          style={{ ["--c" as string]: s.colour }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d={s.d} />
          </svg>
          {s.name}
        </Link>
      ))}
    </div>
  );
}
