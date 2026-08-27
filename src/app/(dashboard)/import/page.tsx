import { requireRole } from "@/lib/require-user";
import { LeadConnectorImportPanel } from "@/components/leadconnector-import-panel";
import { LeadConnectorScopeBackfill } from "@/components/leadconnector-scope-backfill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ImportPage() {
  await requireRole("ADMIN");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import from LeadConnector</h1>
        <p className="text-muted-foreground">
          Pull upcoming appointments from the BWMP Jobs calendar into
          Fieldwork. Nothing is created until you review and confirm.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <LeadConnectorImportPanel />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scope of work backfill</CardTitle>
        </CardHeader>
        <CardContent>
          <LeadConnectorScopeBackfill />
        </CardContent>
      </Card>
    </div>
  );
}
