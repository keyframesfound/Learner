import { NextResponse } from "next/server";
import { z } from "zod";
import { markRead, viewer } from "@/lib/repo";

const payload = z.object({
  chapter: z.string().min(1).max(64),
  fragment: z.string().min(1).max(64),
});

export async function POST(req: Request) {
  const v = await viewer();
  if (!v) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const body = payload.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ ok: false, error: "Invalid chapter or fragment." }, { status: 400 });
  }

  await markRead(v.id, body.data.chapter, body.data.fragment);
  return NextResponse.json({ ok: true });
}
