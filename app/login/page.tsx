import SignIn from "@/components/SignIn";

export default function Login() {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div style={{ fontFamily: "var(--font-display)", fontSize: 40, letterSpacing: "-1.4px", lineHeight: 1 }}>
          Learner
        </div>
        <p className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", lineHeight: 1.8 }}>
          Sign in with your school Google account.<br />
          One account, one streak, one class.
        </p>
        <SignIn />
        <p className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>
          DSE 2027 · ICT and Physics
        </p>
      </div>
    </div>
  );
}
