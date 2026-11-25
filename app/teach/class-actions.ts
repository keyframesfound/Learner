"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isStaff, viewer } from "@/lib/repo";
import { createClass, deleteClass, updateClass } from "@/lib/teach";

export async function createClassAction(formData: FormData) {
  const v = await viewer();
  if (!v) redirect("/login");
  if (!isStaff(v)) redirect("/login");

  const name = String(formData.get("name") ?? "");
  const moduleId = String(formData.get("moduleId") ?? "").trim() || null;

  const res = await createClass(v, name, moduleId);
  if (!res.ok) {
    redirect(`/teach/classes?new=1&error=${encodeURIComponent(res.error)}`);
  }

  revalidatePath("/teach/classes");
  redirect(`/teach/classes/${res.id}`);
}

export async function setCurriculumAction(formData: FormData) {
  const v = await viewer();
  if (!v) redirect("/login");
  if (!isStaff(v)) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/teach/classes");

  const moduleId = String(formData.get("moduleId") ?? "").trim() || null;
  const ok = await updateClass(v, id, { moduleId });
  if (!ok) {
    redirect(`/teach/classes/${id}?error=${encodeURIComponent("Could not update that class.")}`);
  }

  revalidatePath(`/teach/classes/${id}`);
  revalidatePath("/teach/classes");
}

export async function deleteClassAction(formData: FormData) {
  const v = await viewer();
  if (!v) redirect("/login");
  if (!isStaff(v)) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/teach/classes");

  const ok = await deleteClass(v, id);
  if (!ok) {
    redirect(`/teach/classes?error=${encodeURIComponent("Could not delete that class.")}`);
  }

  revalidatePath("/teach/classes");
  redirect("/teach/classes");
}
