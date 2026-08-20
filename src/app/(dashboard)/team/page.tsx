import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-user";
import { TeamMemberForm } from "@/components/team-member-form";
import { ResetPasswordControl } from "@/components/reset-password-control";
import { EditTeamMemberControl } from "@/components/edit-team-member-control";
import { DeactivateTeamMemberControl } from "@/components/deactivate-team-member-control";
import { TeamMemberRow } from "@/components/team-member-row";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function TeamPage() {
  const admin = await requireRole("ADMIN");

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
                <div
                  key={member.id}
                  className={`rounded-lg border p-3 text-sm ${member.deactivatedAt ? "opacity-60" : ""}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{member.name}</span>
                    <div className="flex gap-1.5">
                      {member.deactivatedAt ? (
                        <Badge variant="outline">Deactivated</Badge>
                      ) : null}
                      <Badge variant="secondary">{member.role}</Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-muted-foreground">{member.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <EditTeamMemberControl
                      userId={member.id}
                      name={member.name}
                      email={member.email}
                      phone={member.phone}
                      role={member.role}
                    />
                    <ResetPasswordControl userId={member.id} />
                    <DeactivateTeamMemberControl
                      userId={member.id}
                      isDeactivated={!!member.deactivatedAt}
                      isSelf={member.id === admin.id}
                    />
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
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TeamMemberRow
                      key={member.id}
                      userId={member.id}
                      name={member.name}
                      email={member.email}
                      phone={member.phone}
                      role={member.role}
                      isDeactivated={!!member.deactivatedAt}
                      isSelf={member.id === admin.id}
                    />
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
