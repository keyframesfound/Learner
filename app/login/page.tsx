import { redirect } from "next/navigation";
import AuthError from "@/components/AuthError";
import SignIn from "@/components/SignIn";
import { viewer } from "@/lib/repo";

type LoginSearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Login({ searchParams }: { searchParams: LoginSearchParams }) {
  /* already signed in: send them to the app instead of a second Google round trip */
  const user = await viewer();
  if (user) redirect("/");

  const { error } = await searchParams;
  const code = first(error);

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div style={{ fontFamily: "var(--font-display)", fontSize: 40, letterSpacing: "-1.4px", lineHeight: 1 }}>
          Learner
        </div>
        <SignIn />
        {code ? <AuthError error={code} /> : null}
        <p className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>
          HKDSE ICT · Junior Science
        </p>
      </div>
    </div>
  );
}
