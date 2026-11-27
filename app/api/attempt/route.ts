import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAnswer, viewer } from "@/lib/repo";

/* One answer, graded on the server. The browser sends what the student did —
   a chosen option or a typed string — never whether it was right. */
const attempt = z
  .object({
    blockId: z.string().uuid(),
    lessonId: z.string().uuid(),
    moduleId: z.string().min(1),
    choice: z.number().int().min(0).max(25).nullish(),
    text: z.string().max(200).nullish(),
    ms: z.number().int().min(0).max(3_600_000),
  })
  .refine(
    (a: { choice?: number | null; text?: string | null }) =>
      a.choice != null || (a.text != null && a.text.trim() !== ""),
    { message: "Send a choice or a text answer" },
  );

export async function POST(req: Request) {
  const v = await viewer();
  if (!v) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const parsed = attempt.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid attempt", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  try {
    const graded = await recordAnswer({ userId: v.id, ...parsed.data });
    return NextResponse.json({ ok: true, ...graded });
  } catch (err) {
    /* a lost answer is lost data: log enough to find it again */
    console.error("attempt failed", {
      user: v.email,
      block: parsed.data.blockId,
      lesson: parsed.data.lessonId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Could not record the attempt — try again" },
      { status: 500 },
    );
  }
}
