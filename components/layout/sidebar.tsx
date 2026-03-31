"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Building2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_ITEMS, type NavItem } from "./nav-items";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  items?: NavItem[];
}

export function Sidebar({ open, onClose, items }: SidebarProps) {
  const pathname = usePathname();
  const baseItems = items ?? ADMIN_NAV_ITEMS;
  const [enabledModules, setEnabledModules] = useState<Set<string> | null>(null);

  useEffect(() => {
    // Only filter when using default ADMIN_NAV_ITEMS (dashboard sidebar).
    if (items) return;
    const supabase = createClient();
    let cancelled = false;
    async function load() {
      const { data } = await supabase.auth.getUser();
      const user = data.user as any;
      if (!user) {
        if (!cancelled) setEnabledModules(null);
        return;
      }
      const role = String(user.user_metadata?.role ?? "").toLowerCase();
      if (role === "superadmin") {
        if (!cancelled) setEnabledModules(new Set()); // empty set = show all
        return;
      }
      const { data: rows, error } = await supabase
        .from("business_modules")
        .select("module_key, enabled")
        .eq("enabled", true);
      if (cancelled) return;
      if (error) {
        setEnabledModules(null); // fallback: don't hide nav if not configured
        return;
      }
      setEnabledModules(new Set((rows ?? []).map((r: any) => String(r.module_key))));
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [items]);

  const navItems = useMemo(() => {
    // If enabledModules is null => don't filter (compat mode).
    if (enabledModules === null) return baseItems;
    // If enabledModules is empty set => superadmin (show all).
    if (enabledModules.size === 0) return baseItems;
    return baseItems.filter((it) => !it.moduleKey || enabledModules.has(it.moduleKey));
  }, [baseItems, enabledModules]);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "flex fixed top-0 left-0 z-50 flex-col w-64 h-full text-white transition-transform duration-200 ease-in-out bg-zinc-900 lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-zinc-800">
          <Link href="/dashboard" className="flex gap-3 items-center">
            <div className="flex justify-center items-center w-9 h-9 bg-white rounded-lg">
              <Building2 className="w-5 h-5 text-zinc-900" />
            </div>
            <div>
              <p className="text-base font-bold leading-none">S-INFRA</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Plot CRM</p>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-zinc-400 hover:text-white hover:bg-zinc-800"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Nav Links */}
        <nav className="overflow-y-auto flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800">
          <p className="text-[11px] text-zinc-500">
            © {new Date().getFullYear()} S-INFRA
          </p>
        </div>
      </aside>
    </>
  );
}