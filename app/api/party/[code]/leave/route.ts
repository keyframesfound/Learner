import { viewer } from "@/lib/repo";
import { leaveParty } from "@/lib/party";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ code: string }> };

/** Leave the party. The last player out deletes it. */
export async function POST(_request: Request, { params }: Context) {
  const v = await viewer();
  if (!v) return Response.json({ error: "signed out" }, { status: 401 });

  const { code } = await params;
  try {
    const result = await leaveParty(v.id, code);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not leave the party." }, { status: 500 });
  }
}
