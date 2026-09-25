import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminContext } from "@/lib/auth/session";
import { verifyTwoFactorAction, logoutAction } from "@/server/admin/auth-actions";
import { TwoFactorForm } from "@/components/admin/auth-forms";
import { TwoFactorSetup } from "@/components/admin/two-factor-setup";

export const metadata = { title: "Two-factor authentication" };

export default async function TwoFactorPage({ searchParams }: PageProps<"/admin/2fa">) {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/admin/login");
  const sp = await searchParams;
  if (ctx.twoFactorEnabled && !ctx.twoFactorPassed) return <TwoFactorForm action={verifyTwoFactorAction} />;
  if (!ctx.twoFactorEnabled && sp.setup === "required") {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-ink">Two-factor authentication required</h1>
        <p className="text-sm text-muted">Your role requires two-factor authentication before you can use the dashboard.</p>
        <TwoFactorSetup onDoneHref="/admin" />
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-muted hover:underline">Sign out</button>
        </form>
      </div>
    );
  }
  return (
    <p className="text-sm">
      Already verified. <Link href="/admin" className="text-primary">Go to dashboard</Link>
    </p>
  );
}
