"use client";

import { signOut } from "@/lib/auth-client";

export default function SignOut() {
  return (
    <button
      className="btn ghost"
      type="button"
      onClick={async () => {
        await signOut();
        window.location.href = "/learner/login";
      }}
    >
      Sign out
    </button>
  );
}
