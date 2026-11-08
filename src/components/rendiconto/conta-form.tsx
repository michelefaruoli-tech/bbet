"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveFinancialSnapshotAction, saveFinancialStatementAction } from "@/lib/actions";
import { formatEUR } from "@/lib/format";
import { cn } from "@/lib/cn";

type Props = {
  defaults: { online: number; personalAccounts: number; cash: number; coins: number; correction: number; notes: string };
  auto: { suspended: number; tris: number; clients: number; master: number; lay: number };
  cashFund: number;
};

function fmtInput(n: number) {
  return n === 0 ? "" : n.toFixed(2).replace(".", ",");
}

function parse(v: string) {
  const n = Number(v.trim().replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function ContaForm({ defaults, auto, cashFund }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState("");
  const [values, setValues] = useState({
    online: fmtInput(defaults.online),
    personalAccounts: fmtInput(defaults.personalAccounts),
    cash: fmtInput(defaults.cash),
    coins: fmtInput(defaults.coins),
    correction: fmtInput(defaults.correction),
    notes: defaults.notes,
  });

  const counted = useMemo(
    () =>
      r2(
        parse(values.online) +
          parse(values.personalAccounts) +
          parse(values.cash) +
          parse(values.coins) +
          parse(values.correction),
      ),
    [values],
  );
  const automatic = r2(auto.suspended + auto.master - auto.lay);
  const total = r2(counted + automatic);
  const difference = r2(cashFund - total);
  const result =
    Math.abs(difference) < 0.005
      ? { text: "Conti in pari", tone: "ok" }
      : difference > 0
        ? { text: `Mancano ${formatEUR(difference)}`, tone: "warn" }
        : { text: `${formatEUR(-difference)} in più`, tone: "plus" };

  const field = (key: keyof typeof values, label: string, hint?: string) => (
    <div className="flex items-center justify-between gap-3 border-t border-[#EFEFEA] py-2.5 text-[15px]">
      <label htmlFor={`conta-${key}`}>
        {label}
        {hint && <span className="block text-[13px] text-muted">{hint}</span>}
      </label>
      <input
        id={`conta-${key}`}
        inputMode="decimal"
        placeholder="0,00"
        className="inp w-40 text-right tnum"
        value={values[key]}
        onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
      />
    </div>
  );

  const line = (label: React.ReactNode, value: React.ReactNode, strong = false) => (
    <div className={cn("flex items-center justify-between gap-3 border-t border-[#EFEFEA] py-2.5 text-[15px]", strong && "font-semibold")}>
      <span>{label}</span>
      <span className="tnum">{value}</span>
    </div>
  );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.set("online", values.online || "0");
        fd.set("personalAccounts", values.personalAccounts || "0");
        fd.set("cash", values.cash || "0");
        fd.set("coins", values.coins || "0");
        fd.set("manualCreditAdjustment", values.correction || "0");
        fd.set("cashTotal", String(r2(parse(values.cash) + parse(values.coins))).replace(".", ","));
        fd.set("notes", values.notes);
        startTransition(async () => {
          setSaved("");
          await saveFinancialStatementAction(fd);
          const snap = new FormData();
          snap.set("snapshotType", "CONTA");
          snap.set("notes", values.notes);
          await saveFinancialSnapshotAction(snap);
          setSaved("Conta salvata nell'Archivio");
          router.refresh();
        });
      }}
    >
      <div className="flex flex-wrap gap-4">
        <section className="min-w-0 flex-[1_1_380px] rounded-xl border border-line bg-white px-6 py-5">
          <h2 className="mb-2 flex items-center gap-2.5 text-base font-semibold">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink text-sm text-white">1</span>
            Quello che conti tu
          </h2>
          {field("online", "Online")}
          {field("personalAccounts", "Conti personali")}
          {field("cash", "Contanti")}
          {field("coins", "Monete")}
          {field("correction", "Correzione ±", "facoltativa, anche negativa (es. −50)")}
          {line("Totale contato", formatEUR(counted), true)}
        </section>

        <section className="min-w-0 flex-[1_1_380px] rounded-xl border border-line bg-white px-6 py-5">
          <h2 className="mb-2 flex items-center gap-2.5 text-base font-semibold">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink text-sm text-white">2</span>
            Quello che l&apos;app sa già
          </h2>
          {line(
            <>
              Sospesi (clienti + Tris)
              <span className="block text-[13px] text-muted">
                clienti {formatEUR(auto.clients)} · Tris {formatEUR(auto.tris)}
              </span>
            </>,
            <span className={auto.suspended >= 0 ? "text-plus" : "text-minus"}>{formatEUR(auto.suspended)}</span>,
          )}
          {line("Master", <span className={auto.master >= 0 ? "text-plus" : "text-minus"}>{formatEUR(auto.master)}</span>)}
          {line(
            <>
              LAY
              <span className="block text-[13px] text-muted">saldo {formatEUR(auto.lay)}, si sottrae</span>
            </>,
            formatEUR(-auto.lay),
          )}
          {line("Totale automatico", formatEUR(automatic), true)}
        </section>
      </div>

      <section
        className={cn(
          "flex flex-wrap items-center justify-between gap-6 rounded-xl border px-6 py-5",
          result.tone === "ok" && "border-accent bg-accent-soft",
          result.tone === "warn" && "border-minus-line bg-minus-soft",
          result.tone === "plus" && "border-[#BFD0F7] bg-plus-soft",
        )}
      >
        <div className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 text-[15px] tnum">
          <span>Risulta (1 + 2)</span>
          <strong className="text-right">{formatEUR(total)}</strong>
          <span>Dovrebbe esserci (fondo cassa)</span>
          <strong className="text-right">{formatEUR(cashFund)}</strong>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[13px] font-medium text-muted">Risultato</span>
          <strong
            aria-live="polite"
            className={cn(
              "text-[30px] tracking-tight tnum",
              result.tone === "ok" && "text-accent-dark",
              result.tone === "warn" && "text-minus-dark",
              result.tone === "plus" && "text-plus",
            )}
          >
            {result.text}
          </strong>
        </div>
      </section>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-[1_1_320px] flex-col gap-1.5">
          <label htmlFor="conta-notes" className="text-[13px] font-medium text-muted">
            Note (facoltative)
          </label>
          <input
            id="conta-notes"
            className="inp"
            value={values.notes}
            onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-[10px] bg-accent px-6 text-[15px] font-semibold text-white hover:bg-accent-dark disabled:opacity-50"
        >
          {pending ? "Salvo…" : "Salva la conta"}
        </button>
        <span aria-live="polite" className="text-sm font-semibold text-accent">
          {saved}
        </span>
      </div>
      <p className="text-[13px] text-muted">Le conte salvate restano nell&apos;Archivio, così vedi come è andata mese per mese.</p>
    </form>
  );
}
