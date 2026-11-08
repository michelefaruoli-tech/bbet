import Link from "next/link";
import { Menu, X } from "lucide-react";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/lib/logout-action";
import { NavLinks } from "@/components/layout/nav-links";

export async function Sidebar() {
  const session = await getSession();

  return (
    <>
      <input id="mobile-nav" type="checkbox" className="peer hidden" />
      <label
        htmlFor="mobile-nav"
        aria-label="Apri menu"
        className="fixed left-4 top-4 z-50 flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg bg-ink text-white lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </label>

      <aside className="fixed inset-y-0 left-0 z-40 w-60 -translate-x-full bg-ink text-white transition-transform peer-checked:translate-x-0 lg:translate-x-0">
        <div className="flex h-full flex-col gap-6 px-4 py-6">
          <div className="flex items-center justify-between px-3">
            <Link href="/" className="text-xl font-bold tracking-tight text-white">
              BBET
            </Link>
            <label htmlFor="mobile-nav" aria-label="Chiudi menu" className="cursor-pointer text-[#D4D4D8] lg:hidden">
              <X className="h-5 w-5" aria-hidden="true" />
            </label>
          </div>

          <Link
            href="/movimento"
            className="flex min-h-11 items-center justify-center rounded-[10px] bg-accent text-[15px] font-semibold text-white hover:bg-accent-dark"
          >
            + Movimento
          </Link>

          <nav aria-label="Menu principale" className="flex flex-col gap-1">
            <NavLinks />
          </nav>

          <div className="mt-auto flex flex-col gap-1 border-t border-[#3F3F46] pt-3 text-[13px] text-[#A1A1AA]">
            {session && <span className="px-3 py-1 text-white">{session.name}</span>}
            <Link href="/impostazioni" className="flex min-h-9 items-center rounded-lg px-3 hover:bg-[#27272A] hover:text-white">
              Impostazioni
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex min-h-9 w-full items-center rounded-lg px-3 text-left hover:bg-[#27272A] hover:text-white"
              >
                Esci
              </button>
            </form>
          </div>
        </div>
      </aside>

      <label htmlFor="mobile-nav" className="fixed inset-0 z-30 hidden bg-black/50 peer-checked:block lg:hidden" />
    </>
  );
}
