"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/dashboard/fechas", label: "Fechas" },
  { href: "/dashboard/razas", label: "Razas" },
  { href: "/dashboard/servicios", label: "Servicios" },
];

export default function Sidebar() {
  const pathname = usePathname() || "/";
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("token_type");
    }
    router.push("/login");
  };

  return (
    <aside className="w-56 bg-gray-900 text-white min-h-screen flex flex-col p-4">
      <div className="font-bold text-lg mb-6">Paku Admin</div>

      <nav className="flex flex-col gap-2">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-2 rounded flex items-center text-sm font-medium ${
                active ? "bg-gray-700 text-white" : "text-gray-200 hover:bg-gray-800"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}