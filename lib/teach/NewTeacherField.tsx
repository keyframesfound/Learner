"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addTeacherAction, type StaffState } from "@/app/teach/admin/actions";

function Send() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" aria-label="Add to the staff list" title="Add" disabled={pending}>
      {pending ? "…" : "↵"}
    </button>
  );
}

/**
 * Type the address, press Enter. The role picker appears only for an admin,
 * because a teacher may add teachers but never another admin.
 */
export default function NewTeacherField({ canAddAdmin }: { canAddAdmin: boolean }) {
  const [state, action] = useActionState<StaffState, FormData>(addTeacherAction, {});

  return (
    <div className="staffadd">
      <form action={action} className="namefield">
        <b aria-hidden="true">+</b>
        <input
          name="email"
          type="email"
          placeholder="name@ssc.edu.hk"
          aria-label="Staff email address"
          autoComplete="off"
          required
        />
        {canAddAdmin ? (
          <select name="role" aria-label="Role" defaultValue="teacher">
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
        ) : (
          <input type="hidden" name="role" value="teacher" />
        )}
        <Send />
      </form>
      {state.error ? (
        <div className="staffnote err" role="status">
          {state.error}
        </div>
      ) : null}
    </div>
  );
}
