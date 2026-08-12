import { requireRole } from "@/lib/require-user";
import { createCustomer } from "@/lib/actions/customers";
import { CustomerForm } from "@/components/customer-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewCustomerPage() {
  await requireRole("ADMIN", "DISPATCHER");

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">New customer</h1>
      <Card>
        <CardHeader>
          <CardTitle>Customer details</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm action={createCustomer} submitLabel="Create customer" />
        </CardContent>
      </Card>
    </div>
  );
}
