import { Sidebar } from "@/components/layout/sidebar";
import { PageBreadcrumb } from "@/components/layout/page-breadcrumb";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:pl-64">
      <Sidebar />
      <main className="px-4 py-6 pt-16 lg:px-8">
        <PageBreadcrumb />
        {children}
      </main>
    </div>
  );
}
