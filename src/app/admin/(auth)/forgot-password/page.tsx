import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/auth/session";
import { forgotPasswordAction } from "@/server/admin/auth-actions";
import { ForgotForm } from "@/components/admin/auth-forms";

export const metadata = { title: "Forgot password" };

export default async function ForgotPage() {
  const ctx = await getAdminContext();
  if (ctx && (!ctx.twoFactorEnabled || ctx.twoFactorPassed)) redirect("/admin?notice=already-signed-in");
  return <ForgotForm action={forgotPasswordAction} />;
}