import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAnswer, viewer } from "@/lib/repo";

const attempt = z.object({
  blockId: z.string().uuid(),
  lessonId: z.string().uuid(),
  moduleId: z.string().min(1),
  choice: z.number().int().min(0).max(25),
  correct: z.boolean(),
  ms: z.number().int().min(0).max(3_600_000),
});

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
    await recordAnswer({ userId: v.id, ...parsed.data });
  } catch {
    return NextResponse.json({ error: "Could not record the attempt" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
