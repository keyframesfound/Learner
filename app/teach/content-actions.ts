"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isStaff, viewer, type Viewer } from "@/lib/repo";
import {
  addBlock,
  blocksOf,
  createLesson,
  deleteBlock,
  deleteLesson,
  lessonById,
  moveBlock,
  ownLesson,
  updateBlock,
  updateLesson,
} from "@/lib/teach";

type LessonRecord = {
  id: string;
  module_id: string;
  status: "draft" | "published" | "archived";
};

type McqOption = { text: string; code?: boolean };

type McqPayload = {
  prompt: string;
  code?: string[];
  options: McqOption[];
  answer: number;
  why: string;
  wrongWhy: string;
};

function field(fd: FormData, key: string) {
  const value = fd.get(key);
  return typeof value === "string" ? value : "";
}

function text(fd: FormData, key: string) {
  return field(fd, key).trim();
}

function whole(fd: FormData, key: string, fallback: number) {
  const n = Number.parseInt(text(fd, key), 10);
  return Number.isFinite(n) ? n : fallback;
}

async function lessonRecord(lessonId: string): Promise<LessonRecord | null> {
  const lesson = await lessonById(lessonId);
  return (lesson as LessonRecord | null) ?? null;
}

function revalidate(moduleId: string, lessonId?: string) {
  revalidatePath("/teach/curriculum");
  revalidatePath(`/teach/curriculum/${moduleId}`);
  if (lessonId) revalidatePath(`/teach/curriculum/${moduleId}/${lessonId}`);
}

/** the block must belong to a lesson this teacher owns */
async function ownsBlock(v: Viewer, lessonId: string, blockId: string) {
  if (!(await ownLesson(v, lessonId))) return false;
  const blocks = await blocksOf(lessonId);
  return blocks.some((b) => b.id === blockId);
}

/** parse and validate the mcq contract the drill player renders */
function parseMcq(fd: FormData): McqPayload | null {
  const prompt = text(fd, "prompt");
  const why = text(fd, "why");
  const wrongWhy = text(fd, "wrongWhy");
  const answer = whole(fd, "answer", -1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(field(fd, "options"));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const options: McqOption[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const label = typeof row.text === "string" ? row.text.trim() : "";
    if (!label) return null;
    options.push(row.code === true ? { text: label, code: true } : { text: label });
  }

  if (!prompt || options.length < 2 || options.length > 5) return null;
  if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) return null;
  if (!why) return null;

  const payload: McqPayload = { prompt, options, answer, why, wrongWhy };

  const lines = field(fd, "code")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""));
  while (lines.length > 0 && !lines[0]) lines.shift();
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  if (lines.length > 0) payload.code = lines;

  return payload;
}

/* ── lessons ───────────────────────────────────────────────────────────── */

export async function createLessonAction(formData: FormData) {
  const v = await viewer();
  if (!isStaff(v)) redirect("/login");
  const staff = v as Viewer;

  const moduleId = text(formData, "moduleId");
  if (!moduleId) return;

  const created = await createLesson(staff, moduleId, {
    title: text(formData, "title"),
    summary: text(formData, "summary"),
    minutes: Math.min(8, Math.max(2, whole(formData, "minutes", 4))),
  });
  if (!created.ok) {
    redirect("/teach/curriculum/" + moduleId + "?error=" + encodeURIComponent(created.error));
  }

  revalidate(moduleId, created.id);
  redirect(`/teach/curriculum/${moduleId}/${created.id}`);
}

export async function updateLessonAction(formData: FormData) {
  const v = await viewer();
  if (!isStaff(v)) redirect("/login");
  const staff = v as Viewer;

  const lessonId = text(formData, "lessonId");
  if (!lessonId) return;

  const lesson = await lessonRecord(lessonId);
  if (!lesson) return;
  if (!(await ownLesson(staff, lessonId))) return;

  const status = text(formData, "status");
  await updateLesson(lessonId, {
    title: text(formData, "title") || undefined,
    summary: text(formData, "summary"),
    minutes: Math.min(8, Math.max(2, whole(formData, "minutes", 4))),
    status: status === "published" || status === "archived" ? status : "draft",
  });

  revalidate(lesson.module_id, lessonId);
}

export async function deleteLessonAction(formData: FormData) {
  const v = await viewer();
  if (!isStaff(v)) redirect("/login");
  const staff = v as Viewer;

  const lessonId = text(formData, "lessonId");
  if (!lessonId) return;

  const lesson = await lessonRecord(lessonId);
  if (!lesson) return;
  if (!(await ownLesson(staff, lessonId))) return;

  await deleteLesson(lessonId);
  revalidate(lesson.module_id, lessonId);
  redirect(`/teach/curriculum/${lesson.module_id}`);
}

export async function setStatusAction(formData: FormData) {
  const v = await viewer();
  if (!isStaff(v)) redirect("/login");
  const staff = v as Viewer;

  const lessonId = text(formData, "lessonId");
  if (!lessonId) return;

  const lesson = await lessonRecord(lessonId);
  if (!lesson) return;
  if (!(await ownLesson(staff, lessonId))) return;

  const status = text(formData, "status") === "published" ? "published" : "draft";
  await updateLesson(lessonId, { status });

  revalidate(lesson.module_id, lessonId);
}

/* ── blocks ────────────────────────────────────────────────────────────── */

export async function addProseAction(formData: FormData) {
  const v = await viewer();
  if (!isStaff(v)) redirect("/login");
  const staff = v as Viewer;

  const lessonId = text(formData, "lessonId");
  const md = text(formData, "md");
  if (!lessonId || !md) return;

  const lesson = await lessonRecord(lessonId);
  if (!lesson) return;
  if (!(await ownLesson(staff, lessonId))) return;

  await addBlock(lessonId, "prose", { md });
  revalidate(lesson.module_id, lessonId);
}

export async function addMcqAction(formData: FormData) {
  const v = await viewer();
  if (!isStaff(v)) redirect("/login");
  const staff = v as Viewer;

  const lessonId = text(formData, "lessonId");
  const payload = parseMcq(formData);
  if (!lessonId || !payload) return;

  const lesson = await lessonRecord(lessonId);
  if (!lesson) return;
  if (!(await ownLesson(staff, lessonId))) return;

  await addBlock(lessonId, "mcq", payload);
  revalidate(lesson.module_id, lessonId);
}

export async function updateBlockAction(formData: FormData) {
  const v = await viewer();
  if (!isStaff(v)) redirect("/login");
  const staff = v as Viewer;

  const lessonId = text(formData, "lessonId");
  const blockId = text(formData, "blockId");
  if (!lessonId || !blockId) return;
  if (!(await ownsBlock(staff, lessonId, blockId))) return;

  const lesson = await lessonRecord(lessonId);
  if (!lesson) return;

  if (text(formData, "kind") === "mcq") {
    const payload = parseMcq(formData);
    if (!payload) return;
    await updateBlock(blockId, payload);
  } else {
    const md = text(formData, "md");
    if (!md) return;
    await updateBlock(blockId, { md });
  }

  revalidate(lesson.module_id, lessonId);
}

export async function deleteBlockAction(formData: FormData) {
  const v = await viewer();
  if (!isStaff(v)) redirect("/login");
  const staff = v as Viewer;

  const lessonId = text(formData, "lessonId");
  const blockId = text(formData, "blockId");
  if (!lessonId || !blockId) return;
  if (!(await ownsBlock(staff, lessonId, blockId))) return;

  const lesson = await lessonRecord(lessonId);
  if (!lesson) return;

  await deleteBlock(blockId);
  revalidate(lesson.module_id, lessonId);
}

export async function moveBlockAction(formData: FormData) {
  const v = await viewer();
  if (!isStaff(v)) redirect("/login");
  const staff = v as Viewer;

  const lessonId = text(formData, "lessonId");
  const blockId = text(formData, "blockId");
  if (!lessonId || !blockId) return;
  if (!(await ownsBlock(staff, lessonId, blockId))) return;

  const lesson = await lessonRecord(lessonId);
  if (!lesson) return;

  await moveBlock(blockId, text(formData, "dir") === "-1" ? -1 : 1);
  revalidate(lesson.module_id, lessonId);
}
