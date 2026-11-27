import { viewer } from "@/lib/repo";
import { stateFor } from "@/lib/party";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ code: string }> };

/** The poll endpoint: settles the round if it is due, then returns the party. */
export async function GET(_request: Request, { params }: Context) {
  const v = await viewer();
  if (!v) return Response.json({ error: "signed out" }, { status: 401 });

  const { code } = await params;
  try {
    const result = await stateFor(v.id, code);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result.view);
  } catch {
    return Response.json({ error: "Could not read the party." }, { status: 500 });
  }
}
