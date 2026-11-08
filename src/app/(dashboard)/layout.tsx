import { Sidebar } from "@/components/layout/sidebar";
import { getSession } from "@/lib/auth";
import { autoCloseLayMonths } from "@/lib/lay-closing";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Chiusure mensili automatiche: il 1° del mese si chiude il mese precedente.
  const session = await getSession();
  if (session) {
    try {
      await autoCloseLayMonths(session.id);
    } catch (e) {
      console.error("Chiusura automatica mesi non riuscita", e);
    }
  }

  return (
    <div className="min-h-screen lg:pl-60">
      <Sidebar />
      <main className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 pb-10 pt-20 sm:px-8 lg:px-10 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
