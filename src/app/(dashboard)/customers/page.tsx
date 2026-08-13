import Link from "next/link";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; archived?: string }>;
}) {
  await requireRole("ADMIN", "DISPATCHER");
  const { q, archived } = await searchParams;
  const showArchived = archived === "1";

  const customers = await db.customer.findMany({
    where: {
      archivedAt: showArchived ? { not: null } : null,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { jobs: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {showArchived ? "Archived customers" : "Customers"}
        </h1>
        <Button asChild>
          <Link href="/customers/new">New customer</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form className="flex gap-2">
          {showArchived && <input type="hidden" name="archived" value="1" />}
          <Input
            name="q"
            placeholder="Search by name, email, or phone"
            defaultValue={q ?? ""}
            className="max-w-sm"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <Button asChild variant="outline" size="sm">
          <Link href={showArchived ? "/customers" : "/customers?archived=1"}>
            {showArchived ? "Show active" : "Show archived"}
          </Link>
        </Button>
      </div>

      {customers.length === 0 ? (
        <Card>
          <CardContent className="text-center text-muted-foreground">
            No customers found.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="space-y-3 md:hidden">
            {customers.map((customer) => (
              <Card key={customer.id}>
                <CardContent className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="font-medium hover:underline"
                    >
                      {customer.name}
                    </Link>
                    <span className="text-sm text-muted-foreground">
                      {customer._count.jobs} job{customer._count.jobs === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {[customer.email, customer.phone].filter(Boolean).join(" · ") || "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {[customer.city, customer.state].filter(Boolean).join(", ") || "—"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Jobs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <Link
                          href={`/customers/${customer.id}`}
                          className="font-medium hover:underline"
                        >
                          {customer.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {[customer.email, customer.phone].filter(Boolean).join(" · ") || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {[customer.city, customer.state].filter(Boolean).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="text-right">{customer._count.jobs}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
