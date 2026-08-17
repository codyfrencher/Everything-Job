import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-user";
import { TeamMemberForm } from "@/components/team-member-form";
import { ResetPasswordControl } from "@/components/reset-password-control";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function TeamPage() {
  await requireRole("ADMIN");

  const members = await db.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Team</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile: stacked cards */}
            <div className="space-y-3 p-4 md:hidden">
              {members.map((member) => (
                <div key={member.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{member.name}</span>
                    <Badge variant="secondary">{member.role}</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">{member.email}</p>
                  <div className="mt-2">
                    <ResetPasswordControl userId={member.id} />
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell className="text-muted-foreground">{member.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{member.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <ResetPasswordControl userId={member.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add a team member</CardTitle>
          </CardHeader>
          <CardContent>
            <TeamMemberForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
