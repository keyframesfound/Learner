"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

type Props = {
  course: { name: string; chapters: number; questions: number } | null;
  counts: { chapters: number; questions: number; classes: number };
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

export default function TeachRail({ course, counts, name, role }: Props) {
  const path = usePathname() ?? "";
  const on = (href: string) => path === href || path.startsWith(href + "/");
  const curriculumOn = on("/teach/curriculum") || path === "/teach/new";

  return (
    <aside className="rail">
      <div className="brand"><b>Learner</b><i>TEACH</i></div>

      <div className="course">
        <i>Editing</i>
        {course ? (
          <>
            <b>{course.name}</b>
            <span>{course.chapters} {course.chapters === 1 ? "chapter" : "chapters"} · {course.questions} {course.questions === 1 ? "question" : "questions"}</span>
          </>
        ) : (
          <>
            <b>No curriculum yet</b>
            <span>Create one to start</span>
          </>
        )}
      </div>

      <nav className="nav">
        <Link href="/teach/curriculum" className={curriculumOn ? "on" : ""} style={{ "--c": "var(--lime)" } as CSSProperties}>
          <svg viewBox="0 0 24 24"><path d="M5 4.5h9l5 5v10H5z" /><path d="M14 4.5v5h5M8 14h7M8 17h4" /></svg>
          <span className="lb">Curriculum</span> <span className="n">{counts.chapters}</span>
        </Link>
        <Link href="/teach/questions" className={on("/teach/questions") ? "on" : ""} style={{ "--c": "var(--orange)" } as CSSProperties}>
          <svg viewBox="0 0 24 24"><path d="M4 5.5h16v12H9.5L5.5 21v-3.5H4z" /><path d="M9.8 10.2a2.2 2.2 0 1 1 3.2 2c-.7.4-1 .8-1 1.6M12 16.4v.1" /></svg>
          <span className="lb">Questions</span> <span className="n">{counts.questions}</span>
        </Link>
        <Link href="/teach/classes" className={on("/teach/classes") ? "on" : ""} style={{ "--c": "var(--blue)" } as CSSProperties}>
          <svg viewBox="0 0 24 24"><circle cx="9" cy="9" r="3.2" /><path d="M3.4 20c1.2-3.2 3.1-4.8 5.6-4.8s4.4 1.6 5.6 4.8" /><path d="M16 6.4a3 3 0 0 1 0 5.6M17.4 15.6c1.7.5 2.9 2 3.6 4.4" /></svg>
          <span className="lb">Classes</span> <span className="n">{counts.classes}</span>
        </Link>
        <Link href="/teach/admin" className={on("/teach/admin") ? "on" : ""} style={{ "--c": "var(--gold)" } as CSSProperties}>
          <svg viewBox="0 0 24 24"><path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h7M15 17.5h5" /><circle cx="15" cy="6.5" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="13" cy="17.5" r="2" /></svg>
          <span className="lb">Admin</span>
        </Link>
      </nav>

      <div className="who">
        <span className="av">{initials(name)}</span>
        <span><b>{name}</b><span>{role}</span></span>
      </div>
    </aside>
  );
}
