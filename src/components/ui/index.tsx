import { cn } from "@/lib/cn";
import { amountClass, formatEUR } from "@/lib/format";
import Link from "next/link";

type KpiCardProps = {
  title: string;
  value: number;
  href?: string;
  subtitle?: string;
  highlight?: "ok" | "warn" | "neutral";
};

export function KpiCard({ title, value, href, subtitle, highlight = "neutral" }: KpiCardProps) {
  const content = (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-emerald-50/40 p-4 shadow-sm transition hover:shadow-md",
        highlight === "ok" && "border-emerald-400 from-emerald-50 to-teal-50",
        highlight === "warn" && "border-amber-400 from-amber-50 to-orange-50",
      )}
    >
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className={cn("mt-1 text-2xl font-bold", amountClass(value))}>{formatEUR(value)}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

export function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200/70 bg-slate-100/50 px-4 py-3">
        <h2 className="font-semibold text-slate-800">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50",
        variant === "primary" && "bg-emerald-700 text-white hover:bg-emerald-800",
        variant === "secondary" &&
          "border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        variant === "ghost" && "text-slate-600 hover:bg-slate-200/60",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "ok" | "warn" | "neutral" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "ok" && "bg-emerald-100 text-emerald-800",
        tone === "warn" && "bg-amber-100 text-amber-900",
        tone === "danger" && "bg-red-100 text-red-800",
        tone === "neutral" && "bg-slate-200 text-slate-700",
      )}
    >
      {children}
    </span>
  );
}
