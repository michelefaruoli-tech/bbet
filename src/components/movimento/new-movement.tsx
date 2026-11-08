"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveSuspendedMovementAction } from "@/lib/actions";
import { formatEUR } from "@/lib/format";
import { formatDateIT, formatTimeIT } from "@/lib/timezone";
import { cn } from "@/lib/cn";
import { TrisPlayForm } from "@/components/tris/tris-play-form";
import { QuickLayForm } from "@/components/lay/quick-lay-form";
import { QuickMasterRow } from "@/components/master/quick-master-row";

type Customer = { id: string; label: string; balance: number; isTris: boolean; isPosta?: boolean };

const KINDS = [
  { key: "cliente", title: "Cliente", sub: "Dare / Avere" },
  { key: "tris", title: "Giocata Tris", sub: "aggiorna i Sospesi" },
  { key: "lay", title: "LAY", sub: "entrata / uscita" },
  { key: "master", title: "Master", sub: "ricarica, pagamento…" },
  { key: "prelievo", title: "Prelievo", sub: "dalla cassa" },
  { key: "commissioni", title: "Commissioni", sub: "rendiconto del mese" },
] as const;

type Kind = (typeof KINDS)[number]["key"];

function words(balance: number, isTris: boolean, future = false, isPosta = false) {
  if (Math.abs(balance) < 0.005) return "in pari";
  if (isPosta) return balance > 0 ? `Posta ${future ? "dovrà" : "deve"} mettere ${formatEUR(balance)}` : `da dare a Posta ${formatEUR(-balance)}`;
  if (balance > 0) return `${isTris ? "il Tris " : ""}${future ? "ti dovrà" : "ti deve"} ${formatEUR(balance)}`;
  return `${future ? "gli dovrai" : "gli devi"} ${formatEUR(-balance)}`;
}

function parse(v: string) {
  const n = Number(v.trim().replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : Math.abs(n);
}

export function NewMovement({
  customers,
  trisBalance,
  initialKind = "cliente",
}: {
  customers: Customer[];
  trisBalance: number;
  initialKind?: Kind;
}) {
  const [kind, setKind] = useState<Kind>(initialKind);

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted">1 · Dove?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              aria-pressed={kind === k.key}
              onClick={() => setKind(k.key)}
              className={cn(
                "flex min-h-14 flex-col items-start justify-center gap-0.5 rounded-xl border bg-white px-3.5 py-2 text-left text-[15px] font-semibold",
                kind === k.key ? "border-2 border-accent bg-accent-soft" : "border-[#D4D4CF] hover:border-ink",
              )}
            >
              {k.title}
              <span className="text-[13px] font-medium text-muted">{k.sub}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <section className="flex flex-col gap-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">2 · I dettagli</h2>
        {kind === "cliente" && <ClientMovement customers={customers} />}
        {kind === "tris" && <TrisPlayForm trisBalance={trisBalance} />}
        {kind === "lay" && <QuickLayForm />}
        {kind === "master" && (
          <div className="rounded-xl border border-line bg-white px-6 py-5">
            <p className="mb-3 text-sm text-muted">
              Avere = pagamento (Master ti deve) · Dare = ricarica (tu devi a Master). Per bonus o rettifiche usa{" "}
              <Link href="/conti/master" className="text-accent hover:underline">
                Conti › Master
              </Link>
              .
            </p>
            <QuickMasterRow />
          </div>
        )}
        {kind === "prelievo" && (
          <GoTo href="/cassa/prelievi" text="I prelievi si registrano in Cassa › Prelievi, con fonte e mese." label="Apri Prelievi" />
        )}
        {kind === "commissioni" && (
          <GoTo href="/cassa" text="Le commissioni si inseriscono mese per mese nella tabella di Cassa." label="Apri Commissioni" />
        )}
      </section>
    </div>
  );
}

function GoTo({ href, text, label }: { href: string; text: string; label: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-6 py-5">
      <p className="text-sm">{text}</p>
      <Link href={href} className="inline-flex min-h-11 items-center rounded-[10px] bg-ink px-5 font-semibold text-white hover:bg-black">
        {label}
      </Link>
    </div>
  );
}

function ClientMovement({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [type, setType] = useState<"DARE" | "AVERE">("DARE");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(formatDateIT(new Date()));
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const customer = useMemo(() => customers.find((c) => c.id === customerId), [customers, customerId]);
  const value = parse(amount);
  const after = customer ? Math.round((customer.balance + (type === "DARE" ? value : -value)) * 100) / 100 : 0;

  return (
    <form
      className="flex flex-col gap-4 rounded-xl border border-line bg-white px-6 py-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!customer || !value) {
          setError(!customer ? "Scegli il cliente" : "Inserisci un importo");
          return;
        }
        const fd = new FormData();
        fd.set("customerId", customer.id);
        fd.set("date", date);
        fd.set("time", formatTimeIT());
        fd.set("movementType", type);
        fd.set("amount", amount);
        fd.set("notes", notes);
        startTransition(async () => {
          setError("");
          const res = await saveSuspendedMovementAction(fd);
          if (res && "error" in res && res.error) {
            setError(String(res.error));
            return;
          }
          setMessage(`Salvato · ${customer.label}: ${words(after, customer.isTris, false, customer.isPosta)}`);
          setAmount("");
          setNotes("");
          router.refresh();
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="mv-customer" className="text-[13px] font-medium text-muted">
          Cliente
        </label>
        <select id="mv-customer" className="inp" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">Scegli…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        {customer && (
          <span className="text-sm text-muted">Saldo attuale: {words(customer.balance, customer.isTris, false, customer.isPosta)}</span>
        )}
      </div>
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium text-muted">Tipo</legend>
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-pressed={type === "DARE"}
            onClick={() => setType("DARE")}
            className={cn("inp flex-1 font-semibold", type === "DARE" ? "border-minus bg-minus-soft text-minus-dark" : "text-muted")}
          >
            Dare
          </button>
          <button
            type="button"
            aria-pressed={type === "AVERE"}
            onClick={() => setType("AVERE")}
            className={cn("inp flex-1 font-semibold", type === "AVERE" ? "border-plus bg-plus-soft text-plus" : "text-muted")}
          >
            Avere
          </button>
        </div>
        <p className="mt-1.5 text-[13px] text-muted">
          {customer?.isPosta
            ? type === "DARE"
              ? "Dare = prelievo: dai soldi a Posta, la cassa LAY scende"
              : "Avere = deposito: Posta mette soldi, la cassa LAY sale"
            : customer?.isTris
            ? type === "DARE"
              ? "Dare = soldi dati al Tris"
              : "Avere = soldi ricevuti dal Tris"
            : type === "DARE"
              ? "Dare = hai dato soldi al cliente"
              : "Avere = il cliente ti ha pagato"}
        </p>
      </fieldset>
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-[1_1_140px] flex-col gap-1.5">
          <label htmlFor="mv-amount" className="text-[13px] font-medium text-muted">
            Importo €
          </label>
          <input id="mv-amount" className="inp text-right tnum" inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="flex flex-[1_1_140px] flex-col gap-1.5">
          <label htmlFor="mv-date" className="text-[13px] font-medium text-muted">
            Data (GG/MM/AAAA)
          </label>
          <input id="mv-date" className="inp" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="mv-notes" className="text-[13px] font-medium text-muted">
          Nota
        </label>
        <input id="mv-notes" className="inp" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {customer && value > 0 && (
        <div className="rounded-[10px] bg-[#F6F6F3] px-4 py-3 text-[15px]">
          Dopo il salvataggio <strong>{customer.label}</strong>: <strong>{words(after, customer.isTris, true, customer.isPosta)}</strong>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <span aria-live="polite" className="mr-auto text-sm">
          {message && <span className="font-semibold text-accent">{message}</span>}
          {error && <span className="font-semibold text-red-700">{error}</span>}
        </span>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-[10px] px-4 font-semibold text-muted hover:text-ink">
          Annulla
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-[10px] bg-accent px-6 text-[15px] font-semibold text-white hover:bg-accent-dark disabled:opacity-50"
        >
          {pending ? "Salvo…" : "Salva"}
        </button>
      </div>
    </form>
  );
}
