import { viewer } from "@/lib/repo";
import { changeSource } from "@/lib/party";
import { enrolledModuleIds } from "@/lib/repo";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ code: string }> };

/** Host only, lobby only: pick which class the raid's questions come from. */
export async function POST(request: Request, { params }: Context) {
  const v = await viewer();
  if (!v) return Response.json({ error: "signed out" }, { status: 401 });

  let moduleId = "";
  try {
    const body = (await request.json()) as { moduleId?: unknown };
    if (typeof body?.moduleId === "string") moduleId = body.moduleId;
  } catch {
    return Response.json({ error: "Pick a class first." }, { status: 400 });
  }

  const { code } = await params;
  try {
    const allowed = v.role === "student" ? await enrolledModuleIds(v.id) : undefined;
    const result = await changeSource(v.id, code, moduleId, allowed);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result.view);
  } catch {
    return Response.json({ error: "Could not change the class." }, { status: 500 });
  }
}
