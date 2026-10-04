"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/auth";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { findNavItem } from "./nav-config";

export default function Topbar() {
  const pathname = usePathname() || "/dashboard";
  const router = useRouter();
  const match = findNavItem(pathname);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      {/* Único control para abrir/colapsar el sidebar (también abre el drawer en mobile) */}
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />

      {match ? (
        <p className="text-sm text-muted-foreground">
          {match.group.label !== "General" && (
            <>
              {match.group.label}
              <span className="mx-1.5">/</span>
            </>
          )}
          <span className="font-medium text-foreground">{match.item.label}</span>
        </p>
      ) : (
        <p className="text-sm font-medium text-foreground">Paku Admin</p>
      )}

      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent">
              <Avatar className="size-7 rounded-md">
                <AvatarFallback className="rounded-md bg-primary text-xs text-primary-foreground">
                  AD
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">Admin</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
