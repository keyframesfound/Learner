import { headers } from "next/headers";
import { auth } from "./auth";

export type SignedIn = { id: string; name: string; email: string; image?: string | null };

export async function currentUser(): Promise<SignedIn | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const u = session?.user;
  if (!u) return null;
  return { id: u.id, name: u.name ?? "", email: u.email ?? "", image: u.image ?? null };
}

export function firstName(full: string, fallback = "there") {
  const n = (full || "").trim();
  if (!n) return fallback;
  return n.split(/\s+/)[0] ?? fallback;
}
