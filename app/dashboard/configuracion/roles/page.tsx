// Roles y permisos (DEMO): maqueta. Hoy el backend tiene tres roles fijos; el rol se cambia en Usuarios.

import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_LABELS, type UserRole } from "@/lib/labels";

// Lo que hace cada rol del backend hoy
const ROLES_ACTUALES: { role: UserRole; acceso: string }[] = [
  { role: "admin", acceso: "Panel Admin completo" },
  { role: "groomer", acceso: "App Paku Pro: sus servicios asignados" },
  { role: "user", acceso: "App y web Paku: reservas, mascotas y pagos" },
];

// Propuesta de perfiles dentro del panel (no existen en el backend)
const PERFILES = ["Administrador", "Operaciones", "Finanzas", "Marketing"];
const PERMISOS: { modulo: string; perfiles: string[] }[] = [
  { modulo: "Operaciones (órdenes, asignación, ruta)", perfiles: ["Administrador", "Operaciones"] },
  { modulo: "Catálogo y precios", perfiles: ["Administrador"] },
  { modulo: "Inventario y finanzas", perfiles: ["Administrador", "Finanzas"] },
  { modulo: "CRM", perfiles: ["Administrador", "Marketing"] },
  { modulo: "Configuración", perfiles: ["Administrador"] },
];

export default function RolesPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Roles y permisos"
        description="Quién puede entrar a qué parte del sistema."
        action={<Button disabled><Plus className="size-4" /> Nuevo perfil</Button>}
        className="mb-0"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roles actuales</CardTitle>
          <p className="text-xs text-muted-foreground">
            Definidos en el backend. El rol de cada cuenta se cambia en{" "}
            <Link href="/dashboard/usuarios" className="underline">Usuarios</Link>.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rol</TableHead>
                <TableHead>Acceso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROLES_ACTUALES.map((r) => (
                <TableRow key={r.role}>
                  <TableCell className="font-medium">{ROLE_LABELS[r.role]}</TableCell>
                  <TableCell className="text-muted-foreground">{r.acceso}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permisos del panel por perfil</CardTitle>
          <p className="text-xs text-muted-foreground">Propuesta: perfiles dentro del rol Admin para limitar módulos.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Módulo</TableHead>
                {PERFILES.map((p) => <TableHead key={p} className="text-center">{p}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISOS.map((m) => (
                <TableRow key={m.modulo}>
                  <TableCell>{m.modulo}</TableCell>
                  {PERFILES.map((p) => (
                    <TableCell key={p} className="text-center">
                      {m.perfiles.includes(p)
                        ? <Check className="mx-auto size-4 text-primary" aria-label="Con acceso" />
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
