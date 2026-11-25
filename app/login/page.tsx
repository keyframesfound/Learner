import SignIn from "@/components/SignIn";

export default function Login() {
  return (
    <div style={{ padding: "56px 24px", display: "grid", gap: 16, justifyItems: "center" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 34, letterSpacing: "-1.2px" }}>
        Learner
      </div>
      <p className="mono" style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "center", lineHeight: 1.6 }}>
        Sign in with your school Google account.<br />
        One account, one streak, one class.
      </p>
      <SignIn />
    </div>
  );
}
