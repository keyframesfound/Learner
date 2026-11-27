"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createLessonAction } from "@/app/teach/content-actions";

export type ChapterOption = { id: string; title: string };

/**
 * Chapter switcher: the portal's own dropdown (not a native select) with a search
 * field and an inline "new chapter" so a missing chapter is one keystroke away
 * instead of a trip to the curriculum screen.
 */
export default function ChapterPicker({
  moduleId,
  value,
  options,
}: {
  moduleId: string;
  value: string;
  options: ChapterOption[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  /* where the menu can live: below the trigger when there is room, above it when
     the window is short — otherwise the last chapters sit under the window edge
     with no way to scroll to them */
  const [place, setPlace] = useState<{ up: boolean; max: number }>({ up: false, max: 540 });
  const box = useRef<HTMLDivElement | null>(null);

  const measure = () => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - 16;
    const above = rect.top - 16;
    const up = below < 320 && above > below;
    setPlace({ up, max: Math.max(240, Math.min(540, up ? above : below)) });
  };

  useEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  const current = options.find((o) => o.id === value) ?? null;
  const needle = query.trim().toLowerCase();
  const list = needle ? options.filter((o) => o.title.toLowerCase().includes(needle)) : options;
  const back = `/teach/questions?c=${encodeURIComponent(moduleId)}`;

  return (
    <div className="chap" ref={box}>
      <button
        type="button"
        className="chap-pick"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Choose the chapter"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{current?.title ?? "No chapter yet"}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={open ? "M6 14.5 12 8.5l6 6" : "M6 9.5 12 15.5l6-6"} />
        </svg>
      </button>

      {open ? (
        <div
          className={"chap-menu" + (place.up ? " drop-up" : "")}
          role="menu"
          aria-label="Chapters"
          style={{ maxHeight: place.max }}
        >
          <input
            className="chap-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chapters"
            aria-label="Search chapters"
            autoFocus
            autoComplete="off"
          />

          <div className="chap-list">
            {list.map((option) => (
              <Link
                key={option.id}
                href={`${back}&l=${encodeURIComponent(option.id)}`}
                role="menuitem"
                aria-current={option.id === value ? "true" : undefined}
                className={option.id === value ? "on" : ""}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                }}
              >
                {option.title}
              </Link>
            ))}
            {list.length === 0 ? (
              <div className="chap-none">
                No chapter matches “{query.trim()}”. Add it below.
              </div>
            ) : null}
          </div>

          <span className="sep" />

          {adding ? (
            <form action={createLessonAction} className="new-cur">
              <input type="hidden" name="moduleId" value={moduleId} />
              <input type="hidden" name="back" value={back} />
              <input type="hidden" name="minutes" value="4" />
              <input type="hidden" name="summary" value="" />
              <b aria-hidden="true">+</b>
              <input
                name="title"
                placeholder="New chapter"
                defaultValue={list.length === 0 ? query.trim() : ""}
                aria-label="New chapter title"
                minLength={3}
                maxLength={80}
                required
                autoFocus
                autoComplete="off"
              />
              <button type="submit" aria-label="Create chapter" title="Create">↵</button>
            </form>
          ) : (
            <button
              type="button"
              className="chap-add"
              onClick={() => setAdding(true)}
            >
              <b aria-hidden="true">+</b> New chapter
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
