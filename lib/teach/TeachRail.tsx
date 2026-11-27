"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { deleteCurriculumAction, quickCreateCurriculumAction } from "@/app/teach/content-actions";
import ConfirmSubmit from "@/components/teach/ConfirmSubmit";

export type RailCourse = {
  id: string;
  name: string;
  chapters: number;
  questions: number;
  classes: number;
  trackId: string;
};

type Props = {
  courses: RailCourse[];
  /* what the server would pick with no ?c= — the class's curriculum, else the first */
  fallbackId: string | null;
  classes: number;
  name: string;
  role: string;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

export default function TeachRail({ courses, fallbackId, classes, name, role }: Props) {
  const path = usePathname() ?? "";
  /* The curriculum being edited lives in ?c=. A server layout never sees search
     params, so resolving it there pinned this card to the same curriculum no
     matter which chip was clicked. */
  const activeId = useSearchParams().get("c");
  const course =
    courses.find((c) => c.id === activeId) ??
    courses.find((c) => c.id === fallbackId) ??
    courses[0] ??
    null;

  const chapters = course?.chapters ?? 0;
  const questions = course?.questions ?? 0;
  const trackId = course?.trackId ?? courses[0]?.trackId ?? "";

  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const box = useRef<HTMLDivElement | null>(null);
  const needle = query.trim().toLowerCase();
  const shown = needle ? courses.filter((c) => c.name.toLowerCase().includes(needle)) : courses;

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  /* switching curriculum keeps you on the screen you are on */
  const base = path.startsWith("/teach/questions") ? "/teach/questions" : "/teach/curriculum";

  const on = (href: string) => path === href || path.startsWith(href + "/");
  const curriculumOn = on("/teach/curriculum");

  return (
    <aside className="rail">
      <div className="brand"><b>Learner</b><i>TEACH</i></div>

      <div className="course-wrap" ref={box}>
        <button
          type="button"
          className="course"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Choose the curriculum you are editing"
          onClick={() => setOpen((v) => !v)}
        >
          <svg className="chv" viewBox="0 0 24 24" aria-hidden="true">
            <path d={open ? "M6 14.5 12 8.5l6 6" : "M6 9.5 12 15.5l6-6"} />
          </svg>
          <span className="cbody">
            <i>Editing</i>
            <b>{course?.name ?? "No curriculum yet"}</b>
            <span className="meta">
              {course
                ? `${chapters} ${chapters === 1 ? "chapter" : "chapters"} · ${questions} ${questions === 1 ? "question" : "questions"}`
                : "Name one here"}
            </span>
          </span>
        </button>

        {open ? (
          <div className="cur-menu rail-menu" role="menu" aria-label="Curricula">
            <input
              className="cur-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search curricula"
              aria-label="Search curricula"
              autoComplete="off"
              autoFocus
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                const only = shown.length === 1 ? shown[0] : null;
                if (only) {
                  setOpen(false);
                  setQuery("");
                  router.push(`${base}?c=${encodeURIComponent(only.id)}`);
                } else if (shown.length === 0 && query.trim()) {
                  /* nothing matches: the search text becomes the new curriculum */
                  const form = box.current?.querySelector("form.new-cur") as HTMLFormElement | null;
                  form?.requestSubmit();
                }
              }}
            />
            {shown.length === 0 ? (
              <div className="chap-none">No curriculum matches “{query.trim()}”. Name it below.</div>
            ) : null}
            <div className="cur-list">
            {shown.map((c) => (
              <div key={c.id} className={"cur-row" + (c.id === course?.id ? " on" : "")}>
                {/* Link, not a bare <a> or window.location: Next appends the
                    /learner basePath, and a raw path 404s at the Apache root. */}
                <Link
                  href={`${base}?c=${encodeURIComponent(c.id)}`}
                  role="menuitem"
                  aria-current={c.id === course?.id ? "true" : undefined}
                  onClick={() => setOpen(false)}
                >
                  <span>{c.name}</span>
                  <span className="c">{c.classes} {c.classes === 1 ? "class" : "classes"}</span>
                </Link>
                <ConfirmSubmit
                  action={deleteCurriculumAction}
                  hidden={{ moduleId: c.id, back: base }}
                  label="Delete"
                  className="cur-del"
                  message={
                    `Delete “${c.name}”?\n\n` +
                    (c.classes > 0
                      ? `${c.classes} ${c.classes === 1 ? "class follows" : "classes follow"} it: their roster and marks stay, but they lose this curriculum. `
                      : "") +
                    "Its chapters, questions and notes are removed for good."
                  }
                />
              </div>
            ))}
            </div>

            <span className="sep" />

            {/* type the name and press Enter: no page, no subject field */}
            <form action={quickCreateCurriculumAction} className="new-cur">
              <input type="hidden" name="trackId" value={trackId} />
              <b aria-hidden="true">+</b>
              <input
                name="name"
                placeholder="New curriculum"
                aria-label="New curriculum name"
                maxLength={60}
                autoComplete="off"
                required
                /* nothing matched the search? that text is probably the new name */
                key={shown.length === 0 && query.trim() ? "prefilled-" + query.trim() : "blank"}
                defaultValue={shown.length === 0 ? query.trim() : ""}
              />
              <button type="submit" aria-label="Create curriculum" title="Create">↵</button>
            </form>
          </div>
        ) : null}
      </div>

      <nav className="nav">
        <Link href="/teach/curriculum" className={curriculumOn ? "on" : ""} style={{ "--c": "var(--lime)" } as CSSProperties}>
          <svg viewBox="0 0 24 24"><path d="M5 4.5h9l5 5v10H5z" /><path d="M14 4.5v5h5M8 14h7M8 17h4" /></svg>
          <span className="lb">Curriculum</span> <span className="n">{chapters}</span>
        </Link>
        <Link href="/teach/questions" className={on("/teach/questions") ? "on" : ""} style={{ "--c": "var(--orange)" } as CSSProperties}>
          <svg viewBox="0 0 24 24"><path d="M4 5.5h16v12H9.5L5.5 21v-3.5H4z" /><path d="M9.8 10.2a2.2 2.2 0 1 1 3.2 2c-.7.4-1 .8-1 1.6M12 16.4v.1" /></svg>
          <span className="lb">Questions</span> <span className="n">{questions}</span>
        </Link>
        <Link href="/teach/classes" className={on("/teach/classes") ? "on" : ""} style={{ "--c": "var(--blue)" } as CSSProperties}>
          <svg viewBox="0 0 24 24"><circle cx="9" cy="9" r="3.2" /><path d="M3.4 20c1.2-3.2 3.1-4.8 5.6-4.8s4.4 1.6 5.6 4.8" /><path d="M16 6.4a3 3 0 0 1 0 5.6M17.4 15.6c1.7.5 2.9 2 3.6 4.4" /></svg>
          <span className="lb">Classes</span> <span className="n">{classes}</span>
        </Link>
        <Link href="/teach/admin" className={on("/teach/admin") ? "on" : ""} style={{ "--c": "var(--gold)" } as CSSProperties}>
          <svg viewBox="0 0 24 24"><path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h7M15 17.5h5" /><circle cx="15" cy="6.5" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="13" cy="17.5" r="2" /></svg>
          <span className="lb">Admin</span>
        </Link>

        <span className="sep" />
        <Link href="/" className="exit" title="Open the student app">
          <svg viewBox="0 0 24 24"><path d="M9 4.5H4.5v15H9" /><path d="M20 12H8" /><path d="M12.5 7.5 8 12l4.5 4.5" /></svg>
          <span className="lb">Student view</span>
        </Link>
      </nav>

      <div className="who">
        <span className="av">{initials(name)}</span>
        <span><b>{name}</b><span>{role}</span></span>
      </div>
    </aside>
  );
}
