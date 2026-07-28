"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const SEGMENT_LABELS: Record<string, string> = {
  sospesi: "Sospesi",
  master: "Master",
  scheda: "Scheda",
  commissioni: "Commissioni",
  lay: "LAY",
  prelievi: "Prelievi",
  rendiconto: "Rendiconto",
  report: "Report",
  archivio: "Archivio annuale",
  impostazioni: "Impostazioni",
  tris: "Rendiconto Tris",
};

function segmentLabel(segment: string) {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  if (/^[a-z0-9_-]{12,}$/i.test(segment)) return "Scheda cliente";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function PageBreadcrumb() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) {
    return (
      <nav aria-label="Percorso" className="mb-4 text-sm">
        <span className="rounded-md bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">
          Dashboard
        </span>
      </nav>
    );
  }

  const crumbs: Array<{ href: string; label: string }> = [{ href: "/", label: "Dashboard" }];
  let path = "";
  for (const part of parts) {
    path += `/${part}`;
    crumbs.push({ href: path, label: segmentLabel(part) });
  }

  return (
    <nav aria-label="Percorso" className="mb-4 flex flex-wrap items-center gap-1 text-sm">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
            {isLast ? (
              <span className="rounded-md bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="rounded-md px-2 py-1 text-slate-500 transition hover:bg-slate-100 hover:text-emerald-700"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
