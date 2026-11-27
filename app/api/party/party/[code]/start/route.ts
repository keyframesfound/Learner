import { viewer } from "@/lib/repo";
import { startParty } from "@/lib/party";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ code: string }> };

/** Host only: shuffle the deck and start round 1. */
export async function POST(_request: Request, { params }: Context) {
  const v = await viewer();
  if (!v) return Response.json({ error: "signed out" }, { status: 401 });

  const { code } = await params;
  try {
    const result = await startParty(v.id, code);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result.view);
  } catch {
    return Response.json({ error: "Could not start the raid." }, { status: 500 });
  }
}
