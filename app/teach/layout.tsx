import { redirect } from "next/navigation";
import { isStaff, viewer } from "@/lib/repo";
import { teacherClasses } from "@/lib/teach";
import { moduleList, pickModule } from "./data";
import TeachRail from "@/components/teach/TeachRail";
import "./teach.css";

type ClassRow = { id: string; module_id: string | null };

export default async function TeachLayout({ children }: { children: React.ReactNode }) {
  const v = await viewer();
  if (!v) redirect("/login");
  if (!isStaff(v)) redirect("/");

  const [modules, classes] = await Promise.all([moduleList(), teacherClasses(v)]);
  const rows = classes as ClassRow[];
  const fallback = pickModule(modules, rows);

  /* Pass every curriculum, not one: a layout cannot read ?c=, so the rail picks
     the active one on the client. */
  const courses = modules.map((m) => ({
    id: m.id,
    name: m.name,
    chapters: m.lessons,
    questions: m.questions,
    classes: m.classes,
    trackId: m.track_id,
  }));

  return (
    <div className="tapp">
      <TeachRail
        courses={courses}
        fallbackId={fallback?.id ?? null}
        classes={rows.length}
        name={v.name || v.email}
        role={v.role === "admin" ? "Admin" : "Teacher"}
      />
      <div className="main">{children}</div>
    </div>
  );
}
