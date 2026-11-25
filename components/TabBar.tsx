"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    tab: "learn", href: "/", label: "Learn",
    icon: <path d="M4 11l8-7 8 7v9H4z" />,
  },
  {
    tab: "drills", href: "/drill", label: "Drills",
    icon: <><path d="M5 9v6M19 9v6M8 7v10M16 7v10M8 12h8" /></>,
  },
  {
    tab: "boss", href: "/party", label: "Boss",
    icon: <path d="M12 3.2l2.6 5.4 6 .9-4.3 4.2 1 6-5.3-2.9-5.3 2.9 1-6L3.4 9.5l6-.9z" />,
  },
  {
    tab: "board", href: "/board", label: "Board",
    icon: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3M10 17h4l-1 3h-2z" /></>,
  },
  {
    tab: "me", href: "/me", label: "Me",
    icon: <><circle cx="12" cy="9" r="3.6" /><path d="M5 20c1.6-3.4 4-5 7-5s5.4 1.6 7 5" /></>,
  },
];

export default function TabBar({ badge = 0 }: { badge?: number }) {
  const path = usePathname() ?? "/";
  if (path.endsWith("/login")) return null;
  /* the teacher portal brings its own rail */
  if (path.startsWith("/teach")) return null;
  const active = (href: string) =>
    href === "/" ? path === "/" : path === href || path.startsWith(href + "/") || (href === "/drill" && path.startsWith("/drill"));

  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <Link
          key={t.tab}
          href={t.href}
          className={"tab" + (active(t.href) ? " on" : "")}
          data-tab={t.tab}
        >
          <span className="pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
            <span className="lbl">{t.label}</span>
            {t.tab === "drills" && badge > 0 ? <i className="streak-badge">{badge}</i> : null}
          </span>
        </Link>
      ))}
    </nav>
  );
}
