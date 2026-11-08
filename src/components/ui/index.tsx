import { cn } from "@/lib/cn";
import { formatEUR } from "@/lib/format";
import Link from "next/link";

/* ------------------------------------------------------------------
   Saldi scritti a parole: niente segni da interpretare.
   ------------------------------------------------------------------ */

type Perspective = "customer" | "tris" | "master" | "lay";

/**
 * Trasforma un saldo in parole.
 * - customer: saldo cliente (Dare − Avere). Positivo = "ti deve", negativo = "gli devi".
 * - tris: saldo conto Tris. Positivo = "il Tris ti deve", negativo = "gli devi".
 * - master: positivo = "Master ti deve", negativo = "gli devi".
 * - lay: positivo = "in attivo", negativo = "in passivo".
 */
export function balanceWords(value: number, perspective: Perspective = "customer") {
  const abs = Math.abs(value);
  if (abs < 0.005) return { tone: "zero" as const, label: "in pari", amount: 0 };
  if (perspective === "lay") {
    return value > 0
      ? { tone: "plus" as const, label: "in attivo", amount: abs }
      : { tone: "minus" as const, label: "in passivo", amount: abs };
  }
  return value > 0
    ? { tone: "plus" as const, label: perspective === "customer" ? "ti deve" : "ti deve", amount: abs }
    : { tone: "minus" as const, label: "gli devi", amount: abs };
}

export function toneClass(tone: "plus" | "minus" | "zero") {
  if (tone === "plus") return "text-plus";
  if (tone === "minus") return "text-minus";
  return "text-muted";
}

/** "ti deve 650,00 €" / "gli devi 80,00 €" / "in pari" */
export function BalanceText({
  value,
  perspective = "customer",
  className,
  plural = false,
}: {
  value: number;
  perspective?: Perspective;
  className?: string;
  plural?: boolean;
}) {
  const w = balanceWords(value, perspective);
  const label = plural && w.label === "ti deve" ? "ti devono" : w.label;
  return (
    <span className={cn("font-semibold tnum", toneClass(w.tone), className)}>
      {w.tone === "zero" ? "in pari" : `${label} ${formatEUR(w.amount)}`}
    </span>
  );
}

/** Importo con segno esplicito (per LAY e movimenti) */
export function SignedAmount({ value, className }: { value: number; className?: string }) {
  const sign = value > 0.004 ? "+" : value < -0.004 ? "−" : "";
  const tone = value > 0.004 ? "text-plus" : value < -0.004 ? "text-minus" : "text-muted";
  return (
    <span className={cn("font-semibold tnum", tone, className)}>
      {sign}
      {formatEUR(Math.abs(value))}
    </span>
  );
}

/* ------------------------------------------------------------------
   Contenitori
   ------------------------------------------------------------------ */

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">{title}</h1>
        {subtitle && <div className="mt-1 text-[13px] font-medium text-muted">{subtitle}</div>}
      </div>
      {children}
    </header>
  );
}

/** Schede in alto a destra (es. LAY · Giocate Tris · Master) */
export function Tabs({
  items,
  active,
  label,
}: {
  items: Array<{ href: string; label: string }>;
  active: string;
  label: string;
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1 rounded-[10px] bg-[#EDEDE8] p-1">
      {items.map((it) => {
        const on = it.href === active;
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-lg px-4 text-[15px] font-semibold",
              on ? "bg-ink text-white" : "text-muted hover:text-ink",
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

type KpiCardProps = {
  title: string;
  value: number;
  href?: string;
  subtitle?: string;
  highlight?: "ok" | "warn" | "neutral";
  perspective?: Perspective | "plain";
};

export function KpiCard({ title, value, href, subtitle, highlight = "neutral", perspective = "plain" }: KpiCardProps) {
  const content = (
    <div
      className={cn(
        "flex h-full flex-col gap-1.5 rounded-xl border border-line bg-white p-5 transition",
        href && "hover:border-accent",
        highlight === "ok" && "border-accent bg-accent-soft",
        highlight === "warn" && "border-minus-line bg-minus-soft",
      )}
    >
      <span className="text-[13px] font-medium text-muted">{title}</span>
      {perspective === "plain" ? (
        <span className="text-[26px] font-bold tnum">{formatEUR(value)}</span>
      ) : (
        <>
          <span className={cn("text-sm font-semibold", toneClass(balanceWords(value, perspective).tone))}>
            {balanceWords(value, perspective).label}
          </span>
          <span className="text-[26px] font-bold tnum">{formatEUR(Math.abs(value))}</span>
        </>
      )}
      {subtitle && <span className="text-[13px] font-medium text-muted">{subtitle}</span>}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

export function Card({
  title,
  children,
  action,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-line bg-white", className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-5">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "dark";
}) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-5 text-[15px] font-semibold transition disabled:opacity-50",
        variant === "primary" && "bg-accent text-white hover:bg-accent-dark",
        variant === "dark" && "bg-ink text-white hover:bg-black",
        variant === "secondary" && "border border-[#D4D4CF] bg-white text-ink hover:border-ink",
        variant === "danger" && "border border-red-200 bg-white text-red-700 hover:bg-red-50",
        variant === "ghost" && "text-muted hover:bg-black/5",
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
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        tone === "ok" && "bg-accent-soft text-accent-dark",
        tone === "warn" && "bg-minus-line text-[#5C3208]",
        tone === "danger" && "bg-red-100 text-red-800",
        tone === "neutral" && "bg-[#F0F0EC] text-[#3F3F46]",
      )}
    >
      {children}
    </span>
  );
}

/** Esito della quadratura in parole: "Conti in pari" / "Mancano X €" / "X € in più" */
export function quadratureWords(difference: number) {
  if (Math.abs(difference) < 0.005) return { tone: "ok" as const, title: "Conti in pari" };
  if (difference > 0) return { tone: "warn" as const, title: `Mancano ${formatEUR(difference)}` };
  return { tone: "plus" as const, title: `${formatEUR(Math.abs(difference))} in più` };
}
