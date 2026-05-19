"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Wallet, ShieldCheck, HandHelping, LogOut, Menu, X, Sprout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/loans", label: "My Loans", icon: Wallet },
  { href: "/dashboard/insurance", label: "My Insurance", icon: ShieldCheck },
  { href: "/dashboard/my-sathi", label: "My Sathi", icon: HandHelping },
];

export default function FarmerDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name?: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isDemo = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo");

  useEffect(() => {
    if (isDemo) { setUser({ name: "Ramesh Kumar" }); setReady(true); return; }
    const token = localStorage.getItem("farmer_token");
    if (!token) { router.push("/login"); return; }
    try { const u = localStorage.getItem("farmer_user"); if (u) setUser(JSON.parse(u)); } catch {}
    setReady(true);
  }, [router, isDemo]);

  if (!ready) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-slate-400 text-sm">Loading...</div></div>;

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar — green for farmer */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-green-900 text-white flex flex-col transition-transform duration-200 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-green-700/50">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-400 to-lime-500 flex items-center justify-center">
            <Sprout className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight">FarmerPay</div>
            <div className="text-[11px] text-green-300">Farmer Portal</div>
          </div>
          <button className="ml-auto lg:hidden text-green-300 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={`${item.href}${isDemo ? "?demo=true" : ""}`} onClick={() => setSidebarOpen(false)}
                className={cn("sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                  isActive ? "bg-green-600 text-white" : "text-green-200 hover:text-white"
                )}>
                <item.icon className="w-4.5 h-4.5 flex-shrink-0" />{item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-green-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-xs font-medium text-green-200">
              {user?.name?.charAt(0)?.toUpperCase() || "F"}
            </div>
            <div className="text-sm font-medium truncate">{user?.name || "Farmer"}</div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-green-300 hover:text-white hover:bg-green-800"
            onClick={() => { localStorage.removeItem("farmer_token"); router.push("/login"); }}>
            <LogOut className="w-4 h-4 mr-2" />Logout
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-600 hover:text-slate-900"><Menu className="w-5 h-5" /></button>
          <span className="font-semibold text-green-800">FarmerPay</span>
        </div>
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  );
}
