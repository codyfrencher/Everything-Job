import Link from "next/link";

import { auth } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import type { Role } from "@prisma/client";

const links: { href: string; label: string; roles: Role[] }[] = [
  { href: "/", label: "Dashboard", roles: ["ADMIN", "DISPATCHER", "TECH"] },
  { href: "/schedule", label: "Schedule", roles: ["ADMIN", "DISPATCHER", "TECH"] },
  { href: "/jobs", label: "Jobs", roles: ["ADMIN", "DISPATCHER", "TECH"] },
  { href: "/customers", label: "Customers", roles: ["ADMIN", "DISPATCHER"] },
  { href: "/team", label: "Team", roles: ["ADMIN"] },
];

export async function Nav() {
  const session = await auth();
  const role = session?.user.role;

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="text-lg font-semibold">Fieldwork</span>
          <nav className="flex items-center gap-1">
            {links
              .filter((link) => !role || link.roles.includes(role))
              .map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {session?.user ? (
            <>
              <div className="text-right text-sm leading-tight">
                <div className="font-medium">{session.user.name}</div>
                <Badge variant="secondary" className="text-[10px]">
                  {session.user.role}
                </Badge>
              </div>
              <LogoutButton />
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
