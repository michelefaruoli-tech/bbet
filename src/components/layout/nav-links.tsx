"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Oggi" },
  { href: "/clienti", label: "Clienti" },
  { href: "/conti", label: "Conti" },
  { href: "/cassa", label: "Cassa" },
  { href: "/archivio", label: "Archivio" },
];

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
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center rounded-lg px-3 text-[15px] font-medium transition",
              active ? "bg-white text-ink" : "text-[#D4D4D8] hover:bg-[#27272A] hover:text-white",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
