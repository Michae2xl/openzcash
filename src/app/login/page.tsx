import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Sign in · ZBO" };
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
