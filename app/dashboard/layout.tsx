import type { ReactNode } from "react";
import Sidebar from "./sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        {/* SidebarInset applies correct offsets when the sidebar is collapsed/expanded */}
        <SidebarInset className="flex-1 p-8">
          {/* Full-width page but content centered to a standard max width */}
          <div className="w-full px-4">
            <div className="max-w-5xl mx-auto">{children}</div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}