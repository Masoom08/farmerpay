"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  AlertTriangle,
  Gem,
  Shield,
  Link as LinkIcon,
  Rocket,
  LogOut,
  Sprout,
  Menu,
  X,
  Globe,
  Building2,
  Inbox,
  BarChart3,
  ShieldCheck,
  HandHelping,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/asset-quality", label: "SMA / NPA", icon: AlertTriangle },
  { href: "/dashboard/farmer-performance", label: "Farmer Performance", icon: Users },
  { href: "/dashboard/market", label: "Market Intelligence", icon: TrendingUp },
  { href: "/dashboard/pulse-advisor", label: "PULSE Advisor", icon: Sprout },
  { href: "/dashboard/roots-activity", label: "ROOTS Activity", icon: Sprout },
  { href: "/dashboard/roots-compliance", label: "ROOTS Compliance", icon: Shield },
  { href: "/dashboard/warnings", label: "Early Warnings", icon: Shield },
  { href: "/dashboard/aa", label: "AA Intelligence", icon: ShieldCheck },
  { href: "/dashboard/drishti", label: "DRISHTI Scenarios", icon: BarChart3 },
  { href: "/dashboard/drishti/portfolio-stress", label: "Portfolio Stress", icon: AlertTriangle },
  { href: "/dashboard/loan-inbox", label: "Loan Inbox", icon: Inbox },
  { href: "/dashboard/sathi-network", label: "Sathi Network", icon: HandHelping },
  { href: "/dashboard/cohort", label: "Pilot Cohort", icon: BarChart3 },
  { href: "/dashboard/gold-loan", label: "Gold Loan", icon: Gem },
  { href: "/dashboard/insurance", label: "Insurance", icon: ShieldCheck },
  { href: "/dashboard/compliance", label: "Compliance", icon: Shield },
  { href: "/dashboard/intelligence", label: "AI Intelligence", icon: Rocket },
  { href: "/dashboard/ecosystem", label: "Ecosystem", icon: Globe },
  { href: "/dashboard/scale", label: "Scale Platform", icon: Building2 },
  { href: "/dashboard/integrations", label: "Integrations", icon: LinkIcon },
  { href: "/dashboard/roadmap", label: "Roadmap", icon: Rocket },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name?: string; role?: string } | null>(
    null
  );
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Demo mode: append ?demo=true to any dashboard URL to bypass login
  const isDemo = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo");

  useEffect(() => {
    if (isDemo) {
      setUser({ name: "Demo User", role: "Bank Sakhi (Sathi)" });
      setReady(true);
      return;
    }
    const token = localStorage.getItem("fp_token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const u = localStorage.getItem("fp_user");
      if (u) setUser(JSON.parse(u));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [router, isDemo]);

  function handleLogout() {
    localStorage.removeItem("fp_token");
    localStorage.removeItem("fp_user");
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

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-200 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/50">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Sprout className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight">FarmerPay</div>
            <div className="text-[11px] text-slate-400">Banker Dashboard</div>
          </div>
          <button
            className="ml-auto lg:hidden text-slate-400 hover:text-white"
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
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:text-white"
                )}
              >
                <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="px-4 py-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-300">
              {user?.name?.charAt(0)?.toUpperCase() || "B"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {user?.name || "Banker"}
              </div>
              <div className="text-xs text-slate-400 truncate">
                {user?.role || "Relationship Manager"}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
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
          <span className="font-semibold text-slate-900">FarmerPay</span>
        </div>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
