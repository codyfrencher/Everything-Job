"use client";

import { useState } from "react";

import { diagnoseLeadConnectorEstimate } from "@/lib/actions/leadconnector-import";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LeadConnectorEstimateDiagnostic({
  customers,
}: {
  customers: { id: string; name: string; externalId: string }[];
}) {
  const [contactId, setContactId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    status: number;
    ok: boolean;
    url: string;
    body: string;
  } | null>(null);

  async function run() {
    if (!contactId) return;
    setLoading(true);
    setResult(null);
    const res = await diagnoseLeadConnectorEstimate(contactId);
    setResult(res);
    setLoading(false);
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-4">
      <div>
        <p className="font-medium">Estimate lookup (diagnostic)</p>
        <p className="text-sm text-muted-foreground">
          Temporary — checks whether the LeadConnector API key can read Estimates, and
          what the response actually looks like. Doesn&apos;t touch any Fieldwork data.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={contactId} onValueChange={setContactId}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Pick a customer" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.externalId}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={run} disabled={!contactId || loading}>
          {loading ? "Checking..." : "Look up estimate"}
        </Button>
      </div>

      {result ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {result.ok ? "✅ Success" : "❌ Failed"} — HTTP {result.status}
          </p>
          {result.url ? <p className="text-xs break-all text-muted-foreground">{result.url}</p> : null}
          <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
            {result.body}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
