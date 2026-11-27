"use client";

import { useEffect, useRef, useState } from "react";

export type Level = "easy" | "medium" | "hard";

export const LEVEL_LABEL: Record<Level, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

/**
 * The portal's own dropdown, not a native select: a bordered pill with a chevron
 * and a small menu. The chosen value rides along with the form in a hidden input,
 * because a button cannot be submitted on its own.
 */
export default function LevelPicker({
  value,
  onChange,
}: {
  value: Level;
  onChange: (level: Level) => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);

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

  return (
    <div className="lvlsel" ref={box}>
      <span>Difficulty</span>
      <input type="hidden" name="level" value={value} />
      <button
        type="button"
        className="lvl-pick"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Question difficulty: ${LEVEL_LABEL[value]}`}
        onClick={() => setOpen((v) => !v)}
      >
        {LEVEL_LABEL[value]}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={open ? "M6 14.5 12 8.5l6 6" : "M6 9.5 12 15.5l6-6"} />
        </svg>
      </button>
      {open ? (
        <div className="lvl-menu" role="menu" aria-label="Difficulty">
          {(Object.keys(LEVEL_LABEL) as Level[]).map((key) => (
            <button
              key={key}
              type="button"
              role="menuitemradio"
              aria-checked={key === value}
              className={key === value ? "on" : ""}
              onClick={() => {
                onChange(key);
                setOpen(false);
              }}
            >
              {LEVEL_LABEL[key]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
