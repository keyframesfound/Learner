import { viewer } from "@/lib/repo";
import { joinParty } from "@/lib/party";

export const dynamic = "force-dynamic";

/** Join a lobby by its six-character code. */
export async function POST(request: Request) {
  const v = await viewer();
  if (!v) return Response.json({ error: "signed out" }, { status: 401 });

  let code = "";
  try {
    const body = (await request.json()) as unknown;
    if (body && typeof body === "object" && "code" in body) {
      const raw = (body as { code?: unknown }).code;
      if (typeof raw === "string") code = raw;
    }
  } catch {
    return Response.json({ error: "Enter a party code." }, { status: 400 });
  }
  if (!code.trim()) return Response.json({ error: "Enter a party code." }, { status: 400 });

  try {
    const result = await joinParty(v.id, code);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result.view);
  } catch {
    return Response.json({ error: "Could not join that party." }, { status: 500 });
  }
}
