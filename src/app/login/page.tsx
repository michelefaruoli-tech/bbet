import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">BBET</p>
          <h1 className="text-2xl font-bold text-slate-900">Gestionale Finanziario</h1>
          <p className="mt-1 text-sm text-slate-500">Accedi per continuare</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
