"use client";

import { useRouter } from "next/navigation";

export default function ChapterSelect({
  moduleId,
  value,
  options,
}: {
  moduleId: string;
  value: string;
  options: { id: string; title: string }[];
}) {
  const router = useRouter();

  return (
    <select
      className="sel"
      value={value}
      aria-label="Chapter"
      onChange={(event) => {
        const next = event.target.value;
        router.push(`/teach/questions?c=${encodeURIComponent(moduleId)}&l=${encodeURIComponent(next)}`);
      }}
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>{option.title}</option>
      ))}
    </select>
  );
}
