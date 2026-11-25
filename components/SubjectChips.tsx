import Link from "next/link";
import { subjects } from "@/lib/content";

export type ChipModule = {
  id: string;
  code: string;
  name: string;
  track: string;
  track_name: string;
  accent: string | null;
};

export default function SubjectChips({
  modules,
  activeId,
}: {
  modules: ChipModule[];
  activeId: string;
}) {
  return (
    <div className="subs">
      {modules.map((m) => {
        const icon = subjects.find((s) => s.id === m.track);
        const accent = m.accent ?? icon?.colour ?? "#2D5BFF";
        return (
          <Link
            key={m.id}
            href={`/drill?m=${encodeURIComponent(m.id)}`}
            className={"chip" + (m.id === activeId ? " on" : "")}
            style={{ ["--c" as string]: accent }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
              {icon ? <path d={icon.d} /> : <circle cx="12" cy="12" r="4" />}
            </svg>
            {m.track_name} · {m.code}
          </Link>
        );
      })}
    </div>
  );
}
