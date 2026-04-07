"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth";
import {
  Sidebar as UiSidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarSeparator,
  SidebarRail,
} from "@/components/ui/sidebar";

const links = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/dashboard/fechas", label: "Fechas" },
  { href: "/dashboard/breeds", label: "Razas" },
  { href: "/dashboard/pets", label: "Pets" },
  { href: "/dashboard/orders", label: "Órdenes" },
  { href: "/dashboard/assignments", label: "Asignación" },
  { href: "/dashboard/allies", label: "Allies" },
  { href: "/dashboard/store", label: "Store" },
  { href: "/dashboard/users", label: "Usuarios" },
];

export default function Sidebar() {
  const pathname = usePathname() || "/";
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <UiSidebar>
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center justify-between">
          <div className="font-bold text-lg">Paku Admin</div>
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            const iconMap: Record<string, string> = {
              "/dashboard": "🏠",
              "/dashboard/fechas": "📅",
              "/dashboard/breeds": "🐾",
              "/dashboard/pets": "🐶",
              "/dashboard/orders": "🧺",
              "/dashboard/assignments": "📦",
              "/dashboard/allies": "👥",
              "/dashboard/store": "🛒",
              "/dashboard/users": "👤",
            };

            return (
              <SidebarMenuItem key={l.href}>
                <SidebarMenuButton asChild isActive={active}>
                  <Link href={l.href} className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-5 h-5 text-sm">{iconMap[l.href] ?? "•"}</span>
                    <span>{l.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        {/* Sidebar rail toggle to improve docking behavior */}
        <SidebarRail />

        <div className="mt-auto px-3 py-4">
          <SidebarSeparator />
          <SidebarFooter>
            <Button variant="destructive" onClick={handleLogout} className="w-full text-left">
              Cerrar sesión
            </Button>
          </SidebarFooter>
        </div>
      </SidebarContent>
    </UiSidebar>
  );
}