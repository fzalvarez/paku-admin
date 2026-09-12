"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS, isNavItemActive } from "./nav-config";
import {
  Sidebar as UiSidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar";

export default function Sidebar() {
  const pathname = usePathname() || "/";

  return (
    <UiSidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            P
          </div>
          <span className="truncate font-bold text-lg group-data-[collapsible=icon]:hidden">
            Paku Admin
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="uppercase tracking-wider">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isNavItemActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </UiSidebar>
  );
}
