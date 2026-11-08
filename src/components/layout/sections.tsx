import {
  Archive,
  Crown,
  Dices,
  House,
  Landmark,
  Mail,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Colore e icona di ogni sezione. Le classi sono scritte per intero
 * (Tailwind le trova solo così). I colori cambiano da soli col tema notte.
 */
export type SectionKey = "oggi" | "clienti" | "lay" | "tris" | "master" | "posta" | "cassa" | "archivio";

export const SECTIONS: Record<
  SectionKey,
  {
    label: string;
    icon: LucideIcon;
    text: string;
    bg: string;
    soft: string;
    border: string;
    dot: string;
  }
> = {
  oggi: { label: "Oggi", icon: House, text: "text-sec-oggi", bg: "bg-sec-oggi", soft: "bg-chip", border: "border-l-sec-oggi", dot: "bg-[#A1A1AA]" },
  clienti: { label: "Clienti", icon: Users, text: "text-sec-clienti", bg: "bg-sec-clienti", soft: "bg-sec-clienti-soft", border: "border-l-sec-clienti", dot: "bg-[#60A5FA]" },
  lay: { label: "LAY", icon: Wallet, text: "text-sec-lay", bg: "bg-sec-lay", soft: "bg-sec-lay-soft", border: "border-l-sec-lay", dot: "bg-[#2DD4BF]" },
  tris: { label: "Tris", icon: Dices, text: "text-sec-tris", bg: "bg-sec-tris", soft: "bg-sec-tris-soft", border: "border-l-sec-tris", dot: "bg-[#FB923C]" },
  master: { label: "Master", icon: Crown, text: "text-sec-master", bg: "bg-sec-master", soft: "bg-sec-master-soft", border: "border-l-sec-master", dot: "bg-[#A78BFA]" },
  posta: { label: "Posta", icon: Mail, text: "text-sec-posta", bg: "bg-sec-posta", soft: "bg-sec-posta-soft", border: "border-l-sec-posta", dot: "bg-[#F472B6]" },
  cassa: { label: "Cassa", icon: Landmark, text: "text-sec-cassa", bg: "bg-sec-cassa", soft: "bg-sec-cassa-soft", border: "border-l-sec-cassa", dot: "bg-[#4ADE80]" },
  archivio: { label: "Archivio", icon: Archive, text: "text-sec-archivio", bg: "bg-sec-archivio", soft: "bg-sec-archivio-soft", border: "border-l-sec-archivio", dot: "bg-[#94A3B8]" },
};

export const CONTI_TABS = [
  { href: "/conti", label: "LAY", section: "lay" as SectionKey },
  { href: "/conti/tris", label: "Giocate Tris", section: "tris" as SectionKey },
  { href: "/conti/master", label: "Master", section: "master" as SectionKey },
];

export const CASSA_TABS = [
  { href: "/cassa", label: "Commissioni", section: "cassa" as SectionKey },
  { href: "/cassa/prelievi", label: "Prelievi", section: "cassa" as SectionKey },
  { href: "/cassa/conta", label: "Conta di cassa", section: "cassa" as SectionKey },
];

/** Icona su chip colorato */
export function SectionIcon({ section, size = "md" }: { section: SectionKey; size?: "sm" | "md" }) {
  const s = SECTIONS[section];
  const Icon = s.icon;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-lg ${s.soft} ${s.text} ${
        size === "sm" ? "h-7 w-7" : "h-10 w-10"
      }`}
    >
      <Icon className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
    </span>
  );
}
