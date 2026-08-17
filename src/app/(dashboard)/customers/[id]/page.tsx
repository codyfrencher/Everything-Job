import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-user";
import {
  updateCustomer,
  archiveCustomer,
  restoreCustomer,
} from "@/lib/actions/customers";
import { CustomerForm } from "@/components/customer-form";
import { JobStatusBadge } from "@/components/job-status-badge";
import { DeleteButton } from "@/components/delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN", "DISPATCHER");
  const { id } = await params;

  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      jobs: {
        include: { assignments: { include: { user: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer) notFound();

  const updateCustomerWithId = updateCustomer.bind(null, customer.id);
  const archiveCustomerWithId = archiveCustomer.bind(null, customer.id);
  const restoreCustomerWithId = restoreCustomer.bind(null, customer.id);
  const isArchived = customer.archivedAt !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{customer.name}</h1>
          {isArchived && <Badge variant="secondary">Archived</Badge>}
        </div>
        <div className="flex gap-2">
          {isArchived ? null : (
            <Button asChild>
              <Link href={`/jobs/new?customerId=${customer.id}`}>New job</Link>
            </Button>
          )}
          {isArchived ? (
            <form action={restoreCustomerWithId}>
              <Button type="submit" variant="outline" size="sm">
                Restore customer
              </Button>
            </form>
          ) : (
            <DeleteButton
              action={archiveCustomerWithId}
              label="Archive customer"
              confirmMessage="Archive this customer? Their jobs and photos stay intact, and you can restore them later."
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer details</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerForm
              customer={customer}
              action={updateCustomerWithId}
              submitLabel="Save changes"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job history</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs yet.</p>
            ) : (
              <ul className="divide-y">
                {customer.jobs.map((job) => (
                  <li key={job.id} className="flex items-center justify-between py-3">
                    <div>
                      <Link
                        href={`/jobs/${job.id}`}
                        className="font-medium hover:underline"
                      >
                        {job.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {job.assignments.length > 0
                          ? job.assignments.map((a) => a.user.name).join(", ")
                          : "Unassigned"}
                      </p>
                    </div>
                    <JobStatusBadge status={job.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
