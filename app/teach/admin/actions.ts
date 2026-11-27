"use server";

import { revalidatePath } from "next/cache";
import { viewer } from "@/lib/repo";
import { grantStaff, revokeStaff, type StaffRole } from "@/lib/teach";

/* Both actions return { error } instead of throwing so the field can show the
   refusal in place — "that address is in TEACHER_EMAILS" is the commonest one
   and it reads better next to the input than as a redirect. */

export type StaffState = { error?: string; ok?: boolean };

export async function addTeacherAction(_prev: StaffState, formData: FormData): Promise<StaffState> {
  const v = await viewer();
  if (!v) return { error: "Sign in again." };
  const role: StaffRole = formData.get("role") === "admin" ? "admin" : "teacher";
  const error = await grantStaff(v, String(formData.get("email") ?? ""), role);
  if (error) return { error };
  revalidatePath("/teach/admin");
  return { ok: true };
}

export async function removeTeacherAction(_prev: StaffState, formData: FormData): Promise<StaffState> {
  const v = await viewer();
  if (!v) return { error: "Sign in again." };
  const error = await revokeStaff(v, String(formData.get("email") ?? ""));
  if (error) return { error };
  revalidatePath("/teach/admin");
  return { ok: true };
}
