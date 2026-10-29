import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-user";
import { MaterialForm } from "@/components/material-form";
import { MaterialRow } from "@/components/material-row";
import { EditMaterialControl } from "@/components/edit-material-control";
import { ArchiveMaterialControl } from "@/components/archive-material-control";
import { MaterialPhotoControl } from "@/components/material-photo-control";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function MaterialsPage() {
  await requireRole("ADMIN");

  const materials = await db.material.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Materials</h1>
        <p className="text-sm text-muted-foreground">
          The supply catalog techs pick from on each job&apos;s checklist — add a
          reference photo and optional keywords to get it pre-suggested when a
          job&apos;s Scope of Work mentions them.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Catalog</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {materials.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No supplies yet.</p>
            ) : (
              <>
                {/* Mobile: stacked cards */}
                <div className="space-y-3 p-4 md:hidden">
                  {materials.map((material) => (
                    <div
                      key={material.id}
                      className={`rounded-lg border p-3 text-sm ${material.archivedAt ? "opacity-60" : ""}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{material.name}</span>
                        {material.archivedAt ? <Badge variant="outline">Archived</Badge> : null}
                      </div>
                      {material.keywords ? (
                        <p className="mt-1 text-muted-foreground">
                          Suggested when scope mentions: {material.keywords}
                        </p>
                      ) : null}
                      <div className="mt-2">
                        <MaterialPhotoControl
                          materialId={material.id}
                          photoUrl={material.photoUrl}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <EditMaterialControl
                          materialId={material.id}
                          name={material.name}
                          keywords={material.keywords}
                        />
                        <ArchiveMaterialControl
                          materialId={material.id}
                          isArchived={!!material.archivedAt}
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
                        <TableHead>Photo</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Suggest when scope mentions</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materials.map((material) => (
                        <MaterialRow
                          key={material.id}
                          materialId={material.id}
                          name={material.name}
                          keywords={material.keywords}
                          photoUrl={material.photoUrl}
                          isArchived={!!material.archivedAt}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add a supply</CardTitle>
          </CardHeader>
          <CardContent>
            <MaterialForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
