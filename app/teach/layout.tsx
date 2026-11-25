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
  const course = pickModule(modules, rows);

  return (
    <div className="tapp">
      <TeachRail
        course={course ? { name: course.name, chapters: course.lessons, questions: course.questions } : null}
        counts={{
          chapters: course?.lessons ?? 0,
          questions: course?.questions ?? 0,
          classes: rows.length,
        }}
        name={v.name || v.email}
        role={v.role === "admin" ? "Admin" : "Teacher"}
      />
      <div className="main">{children}</div>
    </div>
  );
}
