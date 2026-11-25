"use client";

import { signIn } from "@/lib/auth-client";

export default function SignIn() {
  return (
    <button
      className="btn"
      style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
      onClick={() => signIn.social({ provider: "google", callbackURL: "/learner" })}
    >
      <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
        <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.8-.4-4H24v7.6h12.1c-.2 2-1.6 5-4.5 7l6.9 5.3c4.1-3.8 6.6-9.4 6.6-15.9z" />
        <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.3c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C7.9 41 15.4 46 24 46z" />
        <path fill="#FBBC05" d="M11.5 28.5A13.7 13.7 0 0 1 10.8 24c0-1.6.3-3.1.7-4.5l-7.1-5.5A22 22 0 0 0 2 24c0 3.5.8 6.9 2.4 9.9z" />
        <path fill="#EA4335" d="M24 10.9c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.7 29.9 2 24 2 15.4 2 7.9 7 4.4 14.5l7.1 5.5C13.3 14.7 18.2 10.9 24 10.9z" />
      </svg>
      Continue with Google
    </button>
  );
}
