"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isStaff, viewer, type Viewer } from "@/lib/repo";
import {
  addBlock,
  blocksOf,
  createLesson,
  deleteBlock,
  deleteCurriculum,
  deleteLesson,
  lessonById,
  moveBlock,
  ownLesson,
  updateBlock,
  updateLesson,
} from "@/lib/teach";
import { createModuleQuick, insertNoteBlock } from "./data";

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

function revalidate() {
  revalidatePath("/teach/curriculum");
  revalidatePath("/teach/questions");
}

function withParam(path: string, key: string, value: string) {
  return path + (path.includes("?") ? "&" : "?") + key + "=" + encodeURIComponent(value);
}

/** only ever send the browser back into the teacher portal */
function backPath(fd: FormData, fallback: string) {
  const raw = text(fd, "back");
  return raw.startsWith("/teach/") ? raw : fallback;
}

/** the block must belong to a lesson this teacher owns */
async function ownsBlock(v: Viewer, lessonId: string, blockId: string) {
  if (!(await ownLesson(v, lessonId))) return false;
  const blocks = await blocksOf(lessonId);
  return blocks.some((b) => b.id === blockId);
}

/** parse and validate the mcq contract the drill player renders */
/** Easy / Medium / Hard map onto the enum's recognise / recall / apply */
function levelOf(fd: FormData): "recognize" | "recall" | "apply" {
  const v = text(fd, "level");
  if (v === "hard") return "apply";
  if (v === "medium") return "recall";
  return "recognize";
}

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

/* ── curriculum ────────────────────────────────────────────────────────── */

export async function quickCreateCurriculumAction(formData: FormData) {
  const v = await viewer();
  if (!isStaff(v)) redirect("/login");

  const name = text(formData, "name");
  const trackId = text(formData, "trackId");
  if (!name) redirect("/teach/curriculum");

  const created = await createModuleQuick({ name, trackId });
  if (!created.ok) redirect("/teach/curriculum?error=" + encodeURIComponent(created.error));

  revalidate();
  redirect("/teach/curriculum?c=" + encodeURIComponent(created.id));
}

/* ── lessons ───────────────────────────────────────────────────────────── */

export async function createLessonAction(formData: FormData) {
  const v = await viewer();
  if (!isStaff(v)) redirect("/login");
  const staff = v as Viewer;

  const moduleId = text(formData, "moduleId");
  if (!moduleId) return;
  const back = backPath(formData, `/teach/curriculum?c=${moduleId}`);

  const created = await createLesson(staff, moduleId, {
    title: text(formData, "title"),
    summary: text(formData, "summary"),
    minutes: Math.min(8, Math.max(2, whole(formData, "minutes", 4))),
  });
  if (!created.ok) {
    redirect(withParam(back, "error", created.error));
  }

  revalidate();
  redirect(withParam(back, "l", created.id));
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

  const patch: { title?: string; summary?: string; minutes?: number; status?: string } = {};
  if (formData.has("title")) {
    const title = text(formData, "title");
    if (title.length >= 3) patch.title = title;
  }
  if (formData.has("summary")) patch.summary = text(formData, "summary");
  if (formData.has("minutes")) {
    patch.minutes = Math.min(8, Math.max(2, whole(formData, "minutes", 4)));
  }
  const status = text(formData, "status");
  if (status === "published" || status === "draft" || status === "archived") {
    patch.status = status;
  }

  await updateLesson(lessonId, patch);
  revalidate();
}

export async function deleteCurriculumAction(formData: FormData) {
  const v = await viewer();
  if (!isStaff(v)) redirect("/login");
  const staff = v as Viewer;

  const moduleId = text(formData, "moduleId");
  if (!moduleId) return;
  const back = text(formData, "back") || "/teach/curriculum";

  const gone = await deleteCurriculum(staff, moduleId);
  revalidate();
  /* the curriculum list is the only place that can show the outcome after a cascade */
  redirect(gone ? "/teach/curriculum" : `${back}${back.includes("?") ? "&" : "?"}error=delete-denied`);
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
  revalidate();
  redirect(`/teach/curriculum?c=${encodeURIComponent(lesson.module_id)}`);
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

  revalidate();
}

/* ── blocks ────────────────────────────────────────────────────────────── */

export async function addProseAction(formData: FormData) {
  const v = await viewer();
  if (!isStaff(v)) redirect("/login");
  const staff = v as Viewer;

  const lessonId = text(formData, "lessonId");
  const type = text(formData, "type");
  const md = text(formData, "md");
  if (!lessonId) return;

  const lesson = await lessonRecord(lessonId);
  if (!lesson) return;
  if (!(await ownLesson(staff, lessonId))) return;

  const back = backPath(formData, `/teach/curriculum?c=${lesson.module_id}&l=${lessonId}`);
  if (!md) redirect(withParam(back, "error", "Write the block first."));

  if (type === "table") {
    const lines = md.split("\n").map((line) => line.trim()).filter(Boolean);
    const piped = lines.length >= 2 && lines.every((line) => line.startsWith("|") && line.endsWith("|"));
    if (!piped) {
      redirect(withParam(back, "error", "A table needs two or more rows, each wrapped in | pipes |."));
    }
  }

  const kind = type === "callout" ? "callout" : "prose";
  const id = await insertNoteBlock(lessonId, kind, md);
  revalidate();
  redirect(id ? withParam(back, "b", id) : back);
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

  const back = backPath(formData, `/teach/questions?c=${lesson.module_id}&l=${lessonId}`);
  const id = await addBlock(lessonId, "mcq", payload, levelOf(formData));
  revalidate();
  redirect(withParam(back, "q", id));
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
    await updateBlock(blockId, payload, levelOf(formData));
  } else {
    const md = text(formData, "md");
    if (!md) return;
    await updateBlock(blockId, { md });
  }

  revalidate();
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
  revalidate();
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
  revalidate();
}
