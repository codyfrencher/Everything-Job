"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function MobileNavMenu({
  links,
  userName,
  userRole,
  logoutButton,
}: {
  links: { href: string; label: string }[];
  userName: string;
  userRole: string;
  logoutButton: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {open ? (
        <div className="absolute inset-x-0 top-full z-50 border-b bg-background px-4 py-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{userName}</div>
              <Badge variant="secondary" className="text-[10px]">
                {userRole}
              </Badge>
            </div>
            {logoutButton}
          </div>
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
