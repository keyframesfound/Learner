"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isStaff, viewer } from "@/lib/repo";
import { createClass, deleteClass, teaches, updateClass } from "@/lib/teach";
import { removeStudent } from "./data";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createClassAction(formData: FormData) {
  const v = await viewer();
  if (!v) redirect("/login");
  if (!isStaff(v)) redirect("/login");

  const name = text(formData, "name");
  const moduleId = text(formData, "moduleId") || null;

  const res = await createClass(v, name, moduleId);
  if (!res.ok) {
    redirect("/teach/classes?error=" + encodeURIComponent(res.error));
  }

  revalidatePath("/teach/classes");
  redirect(`/teach/classes/${res.id}`);
}

export async function renameClassAction(formData: FormData) {
  const v = await viewer();
  if (!v) redirect("/login");
  if (!isStaff(v)) redirect("/login");

  const id = text(formData, "id");
  if (!id) redirect("/teach/classes");

  const name = text(formData, "name");
  if (!name) {
    redirect(`/teach/classes/${id}?error=` + encodeURIComponent("Give the class a name."));
  }

  const ok = await updateClass(v, id, { name });
  if (!ok) {
    redirect(`/teach/classes/${id}?error=` + encodeURIComponent("Could not rename that class."));
  }

  revalidatePath(`/teach/classes/${id}`);
  revalidatePath("/teach/classes");
  redirect(`/teach/classes/${id}`);
}

export async function removeStudentAction(formData: FormData) {
  const v = await viewer();
  if (!v) redirect("/login");
  if (!isStaff(v)) redirect("/login");

  const id = text(formData, "id");
  const studentId = text(formData, "studentId");
  if (!id || !studentId) redirect("/teach/classes");

  if (!(await teaches(v, id))) {
    redirect(`/teach/classes/${id}?error=` + encodeURIComponent("You do not teach that class."));
  }

  await removeStudent(v, id, studentId);
  revalidatePath(`/teach/classes/${id}`);
  redirect(`/teach/classes/${id}`);
}

export async function deleteClassAction(formData: FormData) {
  const v = await viewer();
  if (!v) redirect("/login");
  if (!isStaff(v)) redirect("/login");

  const id = text(formData, "id");
  if (!id) redirect("/teach/classes");

  const ok = await deleteClass(v, id);
  if (!ok) {
    redirect("/teach/classes?error=" + encodeURIComponent("Could not delete that class."));
  }

  revalidatePath("/teach/classes");
  redirect("/teach/classes");
}
