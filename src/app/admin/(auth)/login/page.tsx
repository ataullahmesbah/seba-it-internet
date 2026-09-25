import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/auth/session";
import { loginAction } from "@/server/admin/auth-actions";
import { LoginForm } from "@/components/admin/auth-forms";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const ctx = await getAdminContext();
  if (ctx && (!ctx.twoFactorEnabled || ctx.twoFactorPassed)) redirect("/admin?notice=already-signed-in");
  const sp = await searchParams;
  return <LoginForm action={loginAction} notice={sp.reset ? "Password updated. Please sign in." : undefined} />;
}
