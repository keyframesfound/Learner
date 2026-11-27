import { viewer } from "@/lib/repo";
import { createParty, partyForUser } from "@/lib/party";

export const dynamic = "force-dynamic";

/** The signed-in player's most recent party, or null. */
export async function GET() {
  const v = await viewer();
  if (!v) return Response.json({ error: "signed out" }, { status: 401 });

  try {
    const party = await partyForUser(v.id);
    return Response.json({ party });
  } catch {
    return Response.json({ error: "Could not load your party." }, { status: 500 });
  }
}

/** Create a party and get its code back. */
export async function POST(request: Request) {
  const v = await viewer();
  if (!v) return Response.json({ error: "signed out" }, { status: 401 });

  let moduleId: string | undefined;
  let bossId: string | undefined;
  try {
    const body = (await request.json()) as unknown;
    if (body && typeof body === "object") {
      const { moduleId: m, boss: b } = body as { moduleId?: unknown; boss?: unknown };
      if (typeof m === "string" && m.trim()) moduleId = m.trim();
      if (typeof b === "string" && b.trim()) bossId = b.trim();
    }
  } catch {
    /* an empty body is fine: the default module and boss are used */
  }

  try {
    const result = await createParty(v.id, moduleId, bossId);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result.view, { status: 201 });
  } catch {
    return Response.json({ error: "Could not create a party." }, { status: 500 });
  }
}
