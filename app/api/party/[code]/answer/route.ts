import { viewer } from "@/lib/repo";
import { submitAnswer } from "@/lib/party";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ code: string }> };

/** Lock in one answer for the current round. Body: { choice, round? }. */
export async function POST(request: Request, { params }: Context) {
  const v = await viewer();
  if (!v) return Response.json({ error: "signed out" }, { status: 401 });

  const { code } = await params;
  let choice = Number.NaN;
  let round: number | undefined;
  try {
    const body = (await request.json()) as unknown;
    if (body && typeof body === "object") {
      const rawChoice = (body as { choice?: unknown }).choice;
      const rawRound = (body as { round?: unknown }).round;
      if (typeof rawChoice === "number") choice = rawChoice;
      if (typeof rawRound === "number" && Number.isInteger(rawRound)) round = rawRound;
    }
  } catch {
    return Response.json({ error: "Pick an answer." }, { status: 400 });
  }
  if (!Number.isInteger(choice) || choice < 0) {
    return Response.json({ error: "Pick an answer." }, { status: 400 });
  }

  try {
    const result = await submitAnswer(v.id, code, choice, round);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result.view);
  } catch {
    return Response.json({ error: "Could not send that answer." }, { status: 500 });
  }
}
