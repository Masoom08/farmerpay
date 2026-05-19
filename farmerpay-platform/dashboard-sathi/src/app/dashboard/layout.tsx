"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  Bell,
  IndianRupee,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Share2,
  HandHelping,
  Sprout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/farmers", label: "My Farmers", icon: Users },
  { href: "/dashboard/issues", label: "Issues", icon: AlertTriangle },
  { href: "/dashboard/nudges", label: "Nudges", icon: Bell },
  { href: "/dashboard/commissions", label: "Commissions", icon: IndianRupee },
  { href: "/dashboard/aa-onboard", label: "AA Onboard", icon: ShieldCheck },
  { href: "/dashboard/aa-share", label: "AA Share", icon: Share2 },
  { href: "/dashboard/queue", label: "ROOTS Verify", icon: Sprout },
];

export default function SathiDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name?: string; role?: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Demo mode: append ?demo=true to bypass login
  const isDemo = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo");

  useEffect(() => {
    if (isDemo) {
      setUser({ name: "Priya Sharma", role: "Bank Sakhi" });
      setReady(true);
      return;
    }
    const token = localStorage.getItem("sathi_token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const u = localStorage.getItem("sathi_user");
      if (u) setUser(JSON.parse(u));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [router, isDemo]);

  function handleLogout() {
    localStorage.removeItem("sathi_token");
    localStorage.removeItem("sathi_user");
    router.push("/login");
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — emerald/teal theme for Sathi */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-emerald-900 text-white flex flex-col transition-transform duration-200 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-emerald-700/50">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <HandHelping className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight">Sathi Portal</div>
            <div className="text-[11px] text-emerald-300">FarmerPay CRP</div>
          </div>
          <button
            className="ml-auto lg:hidden text-emerald-300 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={`${item.href}${isDemo ? "?demo=true" : ""}`}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                  isActive
                    ? "bg-emerald-600 text-white"
                    : "text-emerald-200 hover:text-white"
                )}
              >
                <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="px-4 py-4 border-t border-emerald-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-medium text-emerald-200">
              {user?.name?.charAt(0)?.toUpperCase() || "S"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {user?.name || "Sathi"}
              </div>
              <div className="text-xs text-emerald-300 truncate">
                {user?.role || "Community Resource Person"}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-emerald-300 hover:text-white hover:bg-emerald-800"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-600 hover:text-slate-900"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-emerald-800">Sathi Portal</span>
        </div>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
