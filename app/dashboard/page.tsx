import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { NAV_GROUPS } from "./nav-config";

export default function DashboardHome() {
  const quickLinks = NAV_GROUPS.flatMap((g) => g.items).filter((i) => i.href !== "/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Panel Admin Paku</h1>
        <p className="mt-1 text-muted-foreground">Accesos rápidos a las secciones del panel.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition-colors hover:border-primary/50 hover:shadow-md">
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-base">{item.label}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
