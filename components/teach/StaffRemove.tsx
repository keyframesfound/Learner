"use client";

import { useActionState } from "react";
import { removeTeacherAction, type StaffState } from "@/app/teach/admin/actions";

/** One ✕ per row. The refusal (own account, admin, server config) lands on the
    element itself, so the table never has to grow an error column. */
export default function StaffRemove({ email }: { email: string }) {
  const [state, action] = useActionState<StaffState, FormData>(removeTeacherAction, {});

  return (
    <form action={action} className="kick">
      <input type="hidden" name="email" value={email} />
      <button type="submit" aria-label={`Remove ${email}`} title="Remove access">
        ✕
      </button>
      {state.error ? <span className="why">{state.error}</span> : null}
    </form>
  );
}
