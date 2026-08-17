"use client";

import { useState } from "react";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";

import {
  previewLeadConnectorImport,
  runLeadConnectorImport,
  type ImportCandidate,
  type ImportRunResult,
} from "@/lib/actions/leadconnector-import";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { COMPANY_TIME_ZONE } from "@/lib/timezone";

function formatWhen(iso: string) {
  return formatInTimeZone(new Date(iso), COMPANY_TIME_ZONE, "EEE, MMM d, yyyy 'at' h:mm a");
}

export function LeadConnectorImportPanel() {
  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Exclude<ImportRunResult, { error: string }> | null>(null);

  async function loadPreview() {
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await previewLeadConnectorImport();
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      setCandidates(null);
      return;
    }
    setCandidates(res.candidates);
    setSelected(new Set(res.candidates.filter((c) => c.status === "new").map((c) => c.eventId)));
  }

  function toggle(eventId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }

  async function doImport() {
    setLoading(true);
    setError(null);
    const res = await runLeadConnectorImport(Array.from(selected));
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setResult(res);
    await loadPreview();
  }

  const selectable = candidates?.filter((c) => c.status !== "already_imported") ?? [];

  return (
    <div className="space-y-4">
      {!candidates ? (
        <Button type="button" onClick={loadPreview} disabled={loading}>
          {loading ? "Checking LeadConnector..." : "Check for upcoming jobs"}
        </Button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={loadPreview} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={doImport}
            disabled={loading || selected.size === 0}
          >
            {loading ? "Importing..." : `Import ${selected.size} selected`}
          </Button>
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {result ? (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="font-medium">
            Created {result.created}, skipped {result.skipped} already-imported.
          </p>
          {result.failed.length > 0 ? (
            <ul className="mt-1 list-inside list-disc text-destructive">
              {result.failed.map((f) => (
                <li key={f.eventId}>
                  {f.eventId}: {f.error}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {candidates && candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing upcoming on the LeadConnector job calendar right now.
        </p>
      ) : null}

      {selectable.length > 0 ? (
        <div className="space-y-2">
          {candidates!
            .filter((c) => c.status !== "already_imported")
            .map((c) => (
              <label
                key={c.eventId}
                className="flex items-start gap-3 rounded-lg border p-3 text-sm has-checked:border-foreground/40"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-input"
                  checked={selected.has(c.eventId)}
                  onChange={() => toggle(c.eventId)}
                />
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{c.title}</span>
                    {c.status === "possible_duplicate" ? (
                      <Badge variant="secondary">Possibly already in Fieldwork</Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground">
                    {c.customerName} · {formatWhen(c.startTime)}
                    {c.address ? ` · ${c.address}` : ""}
                  </p>
                  {c.status === "possible_duplicate" && c.duplicateJobId ? (
                    <Link
                      href={`/jobs/${c.duplicateJobId}`}
                      className="text-xs text-muted-foreground underline"
                    >
                      View the existing job this might match
                    </Link>
                  ) : null}
                </div>
              </label>
            ))}
        </div>
      ) : null}

      {candidates && candidates.some((c) => c.status === "already_imported") ? (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer">
            {candidates.filter((c) => c.status === "already_imported").length} already imported
          </summary>
          <ul className="mt-2 space-y-1">
            {candidates
              .filter((c) => c.status === "already_imported")
              .map((c) => (
                <li key={c.eventId}>
                  {c.title} · {formatWhen(c.startTime)} —{" "}
                  <Link href={`/jobs/${c.duplicateJobId}`} className="underline">
                    view job
                  </Link>
                </li>
              ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
