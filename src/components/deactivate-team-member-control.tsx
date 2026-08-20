"use client";

import { useState, useTransition } from "react";

import { deactivateTeamMember, reactivateTeamMember } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";

export function DeactivateTeamMemberControl({
  userId,
  isDeactivated,
  isSelf,
}: {
  userId: string;
  isDeactivated: boolean;
  isSelf: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (isDeactivated) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await reactivateTeamMember(userId);
            } catch {
              setError("Couldn't reactivate. Try again.");
            }
          });
        }}
      >
        {isPending ? "Reactivating..." : "Reactivate"}
      </Button>
    );
  }

  if (isSelf) {
    return null;
  }

  return (
    <div>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={() => {
          if (!window.confirm("Deactivate this team member? They'll be signed out and won't be able to log back in until reactivated.")) {
            return;
          }
          setError(null);
          startTransition(async () => {
            try {
              await deactivateTeamMember(userId);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Couldn't deactivate. Try again.");
            }
          });
        }}
      >
        {isPending ? "Deactivating..." : "Deactivate"}
      </Button>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
