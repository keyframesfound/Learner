import Link from "next/link";
import { subjects } from "@/lib/content";

/* The mockup shows every subject across the top, not just the ones with content.
   A subject without a published module simply lands on an empty path. */
export default function SubjectChips({ activeTrack }: { activeTrack: string }) {
  return (
    <div className="subs">
      {subjects.map((s) => (
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
