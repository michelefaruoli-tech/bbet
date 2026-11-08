"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { SECTIONS, type SectionKey } from "@/components/layout/sections";

const NAV: Array<{ href: string; section: SectionKey }> = [
  { href: "/", section: "oggi" },
  { href: "/clienti", section: "clienti" },
  { href: "/conti", section: "lay" },
  { href: "/cassa", section: "cassa" },
  { href: "/archivio", section: "archivio" },
];

const LABELS: Record<string, string> = { "/conti": "Conti" };

/** Colore icona sul menu scuro (sempre scuro, anche di giorno) */
const ICON_TEXT: Record<SectionKey, string> = {
  oggi: "text-[#E4E4E7]",
  clienti: "text-[#60A5FA]",
  lay: "text-[#2DD4BF]",
  tris: "text-[#FB923C]",
  master: "text-[#A78BFA]",
  posta: "text-[#F472B6]",
  cassa: "text-[#4ADE80]",
  archivio: "text-[#94A3B8]",
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const s = SECTIONS[item.section];
        const Icon = s.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition",
              active ? "bg-white text-[#18181B]" : "text-[#D4D4D8] hover:bg-[#27272A] hover:text-white",
            )}
          >
            <span
              aria-hidden="true"
              className={cn("absolute left-0 top-2 bottom-2 w-1 rounded-r", s.dot, active ? "opacity-100" : "opacity-0")}
            />
            <span
              aria-hidden="true"
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-md",
                active ? `${s.dot} text-[#18181B]` : "bg-[#27272A]",
              )}
            >
              <Icon className={cn("h-4 w-4", !active && ICON_TEXT[item.section])} />
            </span>
            {LABELS[item.href] ?? s.label}
          </Link>
        );
      })}
    </>
  );
}
