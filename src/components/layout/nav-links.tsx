"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  BarChart3,
  Banknote,
  LayoutDashboard,
  Settings,
  TrendingUp,
  Users,
  Wallet,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sospesi", label: "Sospesi", icon: Users },
  { href: "/master", label: "Master", icon: Banknote },
  { href: "/commissioni", label: "Commissioni", icon: TrendingUp },
  { href: "/lay", label: "LAY", icon: Wallet },
  { href: "/lay/tris", label: "Rendiconto Tris", icon: FileSpreadsheet },
  { href: "/prelievi", label: "Prelievi", icon: Banknote },
  { href: "/rendiconto", label: "Rendiconto", icon: BarChart3 },
  { href: "/report", label: "Report", icon: BarChart3 },
  { href: "/archivio", label: "Archivio annuale", icon: Archive },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/lay") return pathname === "/lay";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg border-l-4 px-3 py-2.5 text-sm font-medium transition",
              active
                ? "border-emerald-400 bg-emerald-950/60 text-emerald-100 shadow-sm"
                : "border-transparent text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white",
            )}
          >
            <Icon className={cn("h-4 w-4", active && "text-emerald-300")} />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
