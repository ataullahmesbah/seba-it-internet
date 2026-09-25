import { resetPasswordAction } from "@/server/admin/auth-actions";
import { ResetForm } from "@/components/admin/auth-forms";

export const metadata = { title: "Reset password" };

export default async function ResetPage({ searchParams }: PageProps<"/admin/reset-password">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  return <ResetForm action={resetPasswordAction} token={token} />;
}
