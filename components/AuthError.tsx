const MESSAGES: Record<string, string> = {
  access_denied: "Google sign-in was cancelled.",
  OAuthAccountNotLinked: "That email is already registered another way.",
  OAuthSignin: "Google sign-in could not start. Try again.",
  OAuthCallbackError: "Google sign-in did not finish. Try again.",
  Configuration: "Sign-in is not set up correctly. Tell your teacher.",
  Verification: "That sign-in link has expired. Try again.",
};

const FALLBACK = "Sign-in did not complete. Try again.";

export default function AuthError({ error }: { error: string }) {
  const message = MESSAGES[error] ?? MESSAGES[error.toLowerCase()] ?? FALLBACK;
  return (
    <p className="hint" role="alert" style={{ color: "var(--red-ink)", fontSize: 10 }}>
      {message}
    </p>
  );
}
