"use client";

import { useState, useTransition } from "react";

import { backfillScopeOfWorkFromEstimates } from "@/lib/actions/leadconnector-import";
import { Button } from "@/components/ui/button";

export function LeadConnectorScopeBackfill() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { error: string } | { scanned: number; updated: number; noEstimate: number } | null
  >(null);

  function run() {
    setResult(null);
    startTransition(async () => {
      const res = await backfillScopeOfWorkFromEstimates();
      setResult(res);
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Fills in Scope of Work for existing jobs that don&apos;t have one yet, using each
        job&apos;s customer&apos;s LeadConnector estimate. Only touches jobs with a blank
        Scope of Work — safe to run more than once.
      </p>
      <Button type="button" variant="outline" onClick={run} disabled={isPending}>
        {isPending ? "Backfilling..." : "Backfill Scope of Work"}
      </Button>

      {result ? (
        "error" in result ? (
          <p className="text-sm text-destructive">{result.error}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Checked {result.scanned} job{result.scanned === 1 ? "" : "s"} with no Scope of
            Work. Filled in {result.updated}. {result.noEstimate} had no matching estimate in
            LeadConnector.
          </p>
        )
      ) : null}
    </div>
  );
}
