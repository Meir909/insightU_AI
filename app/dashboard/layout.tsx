import type { ReactNode } from "react";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TopBar } from "@/components/dashboard/topbar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dot-grid min-h-screen bg-bg-base">
      <Sidebar />
      <div className="lg:ml-64">
        <TopBar />
        <main className="page-shell px-4 py-6 pb-24 lg:px-8 lg:pb-6">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
