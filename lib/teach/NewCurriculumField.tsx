"use client";

import { quickCreateCurriculumAction } from "@/app/teach/content-actions";

/**
 * Type the name, press Enter. No subject field, no separate page — the curriculum
 * is created and the portal opens it.
 */
export default function NewCurriculumField({
  trackId,
  placeholder = "New curriculum",
}: {
  trackId: string;
  placeholder?: string;
}) {
  return (
    <form action={quickCreateCurriculumAction} className="namefield">
      <input type="hidden" name="trackId" value={trackId} />
      <b aria-hidden="true">+</b>
      <input
        name="name"
        placeholder={placeholder}
        aria-label="New curriculum name"
        maxLength={60}
        autoComplete="off"
        required
      />
      <button type="submit" aria-label="Create curriculum" title="Create">↵</button>
    </form>
  );
}
