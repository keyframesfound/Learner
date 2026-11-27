import { notFound } from "next/navigation";
import ItemPlayer from "@/components/ItemPlayer";
import { enrolledModuleIds, getLesson, getPath, viewer } from "@/lib/repo";

export default async function ItemPage({ params }: { params: Promise<{ lesson: string }> }) {
  const { lesson: slug } = await params;
  const [v, data] = await Promise.all([viewer(), getLesson(slug)]);
  if (!data) notFound();

  const { lesson, items, notes } = data;

  /* a student only drills what their classes run — a shared link to another
     class's lesson must not open */
  const allowed = v && v.role === "student" ? await enrolledModuleIds(v.id) : undefined;
  if (allowed && !allowed.includes(lesson.module_id)) notFound();

  let nextSlug: string | undefined;
  let nextTitle: string | undefined;
  let lessonNumber: number | undefined;
  if (v) {
    const path = await getPath(v.id, lesson.module_id, allowed);
    const idx = path.lessons.findIndex((l) => l.slug === lesson.slug);
    if (idx >= 0) lessonNumber = idx + 1;
    const next = idx >= 0 ? path.lessons[idx + 1] : undefined;
    if (next) {
      nextSlug = next.slug;
      nextTitle = next.title;
    }
  }

  return (
    <ItemPlayer
      items={items}
      lessonId={lesson.id}
      moduleId={lesson.module_id}
      lessonTitle={lesson.title}
      nextSlug={nextSlug}
      nextTitle={nextTitle}
      lessonNumber={lessonNumber}
      notes={notes}
    />
  );
}
