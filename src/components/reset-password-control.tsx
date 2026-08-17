"use client";

import { useActionState, useState } from "react";

import { resetTeamMemberPassword } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordControl({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    resetTeamMemberPassword.bind(null, userId),
    undefined,
  );

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Reset password
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-2">
      <div className="min-w-[180px] flex-1">
        <Input
          type="password"
          name="password"
          placeholder="New temporary password"
          minLength={8}
          required
          autoFocus
        />
        {state?.error ? <p className="mt-1 text-xs text-destructive">{state.error}</p> : null}
        {state?.success ? (
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
            Password updated — let them know their new temporary password.
          </p>
        ) : null}
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}
