import { viewer } from "@/lib/repo";
import { changeBoss } from "@/lib/party";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ code: string }> };

/** Host only, lobby only: swap the boss before the raid starts. */
export async function POST(request: Request, { params }: Context) {
  const v = await viewer();
  if (!v) return Response.json({ error: "signed out" }, { status: 401 });

  let boss = "";
  try {
    const body = (await request.json()) as { boss?: unknown };
    if (typeof body?.boss === "string") boss = body.boss;
  } catch {
    return Response.json({ error: "Pick a boss first." }, { status: 400 });
  }

  const { code } = await params;
  try {
    const result = await changeBoss(v.id, code, boss);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result.view);
  } catch {
    return Response.json({ error: "Could not change the boss." }, { status: 500 });
  }
}
