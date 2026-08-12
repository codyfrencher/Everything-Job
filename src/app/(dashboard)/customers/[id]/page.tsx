import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-user";
import { updateCustomer, deleteCustomer } from "@/lib/actions/customers";
import { CustomerForm } from "@/components/customer-form";
import { JobStatusBadge } from "@/components/job-status-badge";
import { DeleteButton } from "@/components/delete-button";
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
        include: { assignedTo: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer) notFound();

  const updateCustomerWithId = updateCustomer.bind(null, customer.id);
  const deleteCustomerWithId = deleteCustomer.bind(null, customer.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{customer.name}</h1>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/jobs/new?customerId=${customer.id}`}>New job</Link>
          </Button>
          <DeleteButton
            action={deleteCustomerWithId}
            label="Delete customer"
            confirmMessage="Delete this customer and all of their jobs? This can't be undone."
          />
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
                        {job.assignedTo ? job.assignedTo.name : "Unassigned"}
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
