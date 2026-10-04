import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CalendarDays,
  ShoppingBasket,
  ClipboardCheck,
  ClipboardList,
  Store,
  PawPrint,
  Dog,
  Users,
  UserCircle,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// Fuente única de verdad para el sidebar, el topbar (breadcrumb) y los
// accesos rápidos del home — evita mantener el mapeo ruta→label en 3 lugares.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "General",
    items: [{ href: "/dashboard", label: "Inicio", icon: LayoutDashboard }],
  },
  {
    label: "Operaciones",
    items: [
      { href: "/dashboard/fechas", label: "Fechas", icon: CalendarDays },
      { href: "/dashboard/ordenes", label: "Órdenes", icon: ShoppingBasket },
      { href: "/dashboard/asignaciones", label: "Asignación", icon: ClipboardCheck },
      { href: "/dashboard/historial-clinico", label: "Historial clínico", icon: ClipboardList },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { href: "/dashboard/tienda", label: "Tienda", icon: Store },
      { href: "/dashboard/razas", label: "Razas", icon: PawPrint },
      { href: "/dashboard/mascotas", label: "Mascotas", icon: Dog },
    ],
  },
  {
    label: "Cuentas",
    items: [
      { href: "/dashboard/groomers", label: "Groomers", icon: Users },
      { href: "/dashboard/usuarios", label: "Usuarios", icon: UserCircle },
    ],
  },
];

// "/dashboard" (Inicio) es prefijo de TODAS las subrutas del dashboard, así
// que necesita match exacto — si no, siempre "gana" sobre la página real.
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export function findNavItem(pathname: string): { group: NavGroup; item: NavItem } | null {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (isNavItemActive(pathname, item.href)) {
        return { group, item };
      }
    }
  }
  return null;
}
