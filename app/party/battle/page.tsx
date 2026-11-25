import { redirect } from "next/navigation";
import BossBattle from "@/components/BossBattle";

type Props = { searchParams: Promise<{ code?: string | string[] }> };

export default async function BattlePage({ searchParams }: Props) {
  const params = await searchParams;
  const raw = Array.isArray(params.code) ? params.code[0] : params.code;
  const code = (raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!code) redirect("/party");
  return <BossBattle code={code} />;
}
