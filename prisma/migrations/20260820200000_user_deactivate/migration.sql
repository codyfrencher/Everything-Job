-- Lets an Admin lock a team member out of the app without deleting their
-- historical job assignments, uploaded photos, or created customers.
ALTER TABLE "User" ADD COLUMN "deactivatedAt" TIMESTAMP(3);
