"use client";

import { Button } from "@/components/ui/button";

export function DeleteButton({
  action,
  label,
  confirmMessage,
}: {
  action: () => Promise<void>;
  label: string;
  confirmMessage: string;
}) {
  return (
    <form
      action={() => {
        if (window.confirm(confirmMessage)) {
          action();
        }
      }}
    >
      <Button type="submit" variant="destructive" size="sm">
        {label}
      </Button>
    </form>
  );
}
