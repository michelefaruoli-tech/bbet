import { LogOut, Menu, X } from "lucide-react";
import { getSession } from "@/lib/auth";
import { roleLabel } from "@/lib/roles";
import { logoutAction } from "@/lib/logout-action";
import { NavLinks } from "@/components/layout/nav-links";

export async function Sidebar() {
  const session = await getSession();

  return (
    <>
      <input id="mobile-nav" type="checkbox" className="peer hidden" />
      <label
        htmlFor="mobile-nav"
        className="fixed left-4 top-4 z-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-slate-800 text-white lg:hidden"
      >
        <Menu className="h-5 w-5 peer-checked:hidden" />
      </label>

      <aside className="fixed inset-y-0 left-0 z-40 w-64 -translate-x-full border-r border-slate-700/40 bg-slate-900 text-slate-100 transition-transform peer-checked:translate-x-0 lg:translate-x-0">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-700 px-5 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Gestionale
                </p>
                <h1 className="text-xl font-bold text-white">BBET</h1>
              </div>
              <label htmlFor="mobile-nav" className="cursor-pointer text-slate-300 lg:hidden">
                <X className="h-5 w-5" />
              </label>
            </div>
            {session && (
              <div className="mt-3 rounded-lg bg-slate-800/80 px-3 py-2">
                <p className="truncate text-sm font-medium text-white">{session.name}</p>
                <p className="text-xs text-emerald-400">{roleLabel(session.role)}</p>
              </div>
            )}
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            <NavLinks />
          </nav>

          <form action={logoutAction} className="border-t border-slate-700 p-3">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-red-950/50 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              Esci
            </button>
          </form>
        </div>
      </aside>

      <label
        htmlFor="mobile-nav"
        className="fixed inset-0 z-30 hidden bg-black/50 peer-checked:block lg:hidden"
      />
    </>
  );
}
