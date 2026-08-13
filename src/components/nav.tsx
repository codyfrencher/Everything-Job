import Link from "next/link";

import { auth } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { MobileNavMenu } from "@/components/mobile-nav-menu";
import { NotificationToggle } from "@/components/notification-toggle";
import { Badge } from "@/components/ui/badge";
import type { Role } from "@prisma/client";

const links: { href: string; label: string; roles: Role[] }[] = [
  { href: "/", label: "Dashboard", roles: ["ADMIN", "DISPATCHER", "TECH"] },
  { href: "/schedule", label: "Schedule", roles: ["ADMIN", "DISPATCHER", "TECH"] },
  { href: "/jobs", label: "Jobs", roles: ["ADMIN", "DISPATCHER", "TECH"] },
  { href: "/customers", label: "Customers", roles: ["ADMIN", "DISPATCHER"] },
  { href: "/team", label: "Team", roles: ["ADMIN"] },
  { href: "/audit", label: "Audit log", roles: ["ADMIN"] },
];

export async function Nav() {
  const session = await auth();
  const role = session?.user.role;
  const visibleLinks = links.filter((link) => !role || link.roles.includes(role));

  return (
    <header className="relative border-b bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/" className="shrink-0 text-lg font-semibold">
            Fieldwork
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {visibleLinks.map((link) => (
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

        <div className="hidden items-center gap-3 md:flex">
          {session?.user ? (
            <>
              <NotificationToggle />
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

        {session?.user ? (
          <MobileNavMenu
            links={visibleLinks}
            userName={session.user.name}
            userRole={session.user.role}
            logoutButton={<LogoutButton />}
            notificationToggle={<NotificationToggle />}
          />
        ) : null}
      </div>
    </header>
  );
}
