import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8">
        <div className="mb-6 text-center">
          <p className="text-xl font-bold tracking-tight">BBET</p>
          <h1 className="sr-only">Accedi</h1>
          <p className="mt-1 text-sm text-muted">Accedi per continuare</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
