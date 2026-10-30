import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CalendarDays,
  ShoppingBasket,
  ClipboardCheck,
  ClipboardList,
  Route,
  Store,
  PawPrint,
  Dog,
  Users,
  UserCircle,
  Timer,
  Boxes,
  CreditCard,
  HandCoins,
  FileBarChart,
  Contact,
  HeartHandshake,
  Megaphone,
  BellRing,
  Plug,
  ShieldCheck,
  SlidersHorizontal,
  Cable,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Módulo de demostración con datos de ejemplo (sin backend): se marca con "Demo" en el menú. */
  demo?: boolean;
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
      { href: "/dashboard/ruta", label: "Ruta del día", icon: Route },
      { href: "/dashboard/historial-clinico", label: "Historial clínico", icon: ClipboardList },
      { href: "/dashboard/tiempos", label: "Tiempos", icon: Timer },
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
    label: "Inventario y finanzas",
    items: [
      { href: "/dashboard/inventario", label: "Inventario", icon: Boxes },
      { href: "/dashboard/finanzas/pagos", label: "Pagos y conciliación", icon: CreditCard, demo: true },
      { href: "/dashboard/finanzas/variable-groomer", label: "Variable groomer", icon: HandCoins, demo: true },
      { href: "/dashboard/finanzas/cierre", label: "Cierre mensual / P&L", icon: FileBarChart, demo: true },
    ],
  },
  {
    label: "CRM",
    items: [
      { href: "/dashboard/crm/clientes", label: "Clientes", icon: Contact },
      { href: "/dashboard/crm/fidelizacion", label: "Fidelización", icon: HeartHandshake, demo: true },
      { href: "/dashboard/crm/campanas", label: "Campañas y promociones", icon: Megaphone },
      { href: "/dashboard/crm/recordatorios", label: "Recordatorios", icon: BellRing, demo: true },
      { href: "/dashboard/crm/integraciones", label: "Integraciones CRM", icon: Plug, demo: true },
    ],
  },
  {
    label: "Configuración",
    items: [
      { href: "/dashboard/usuarios", label: "Usuarios", icon: UserCircle },
      { href: "/dashboard/groomers", label: "Groomers", icon: Users },
      { href: "/dashboard/configuracion/roles", label: "Roles y permisos", icon: ShieldCheck, demo: true },
      { href: "/dashboard/configuracion/parametros", label: "Parámetros generales", icon: SlidersHorizontal },
      { href: "/dashboard/configuracion/integraciones", label: "Integraciones", icon: Cable, demo: true },
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
