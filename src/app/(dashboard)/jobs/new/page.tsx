import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-user";
import { createJob } from "@/lib/actions/jobs";
import { JobForm } from "@/components/job-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  await requireRole("ADMIN", "DISPATCHER");
  const { customerId } = await searchParams;

  const [customers, techs] = await Promise.all([
    db.customer.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    db.user.findMany({
      where: { role: "TECH" },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">New job</h1>
      <Card>
        <CardHeader>
          <CardTitle>Job details</CardTitle>
        </CardHeader>
        <CardContent>
          <JobForm
            customers={customers}
            techs={techs}
            defaultCustomerId={customerId}
            action={createJob}
            submitLabel="Create job"
          />
        </CardContent>
      </Card>
    </div>
  );
}
