import type { ReactNode } from "react";
import Sidebar from "./sidebar";
import Topbar from "./topbar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted">
        <Sidebar />
        {/* SidebarInset applies correct offsets when the sidebar is collapsed/expanded */}
        {/* min-w-0: una tabla ancha hace scroll dentro de su tarjeta en vez de estirar la página */}
        <SidebarInset className="min-w-0 flex-1 bg-muted">
          <Topbar />
          {/* Full-width page but content centered to a standard max width */}
          <div className="w-full px-4 py-8">
            <div className="max-w-7xl mx-auto">{children}</div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
