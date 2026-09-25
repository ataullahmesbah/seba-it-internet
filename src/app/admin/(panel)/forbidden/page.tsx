import Link from "next/link";
import { ShieldX } from "lucide-react";

export const metadata = { title: "Access denied" };

export default function ForbiddenPage() {
  return (
    <div className="card mx-auto max-w-lg p-10 text-center">
      <ShieldX className="mx-auto h-12 w-12 text-danger" />
      <h1 className="mt-4 text-xl font-bold">Access denied</h1>
      <p className="mt-2 text-sm text-muted">Your role does not include permission for this module. Contact a Super Admin if you need access.</p>
      <Link href="/admin" className="btn-primary mt-6">Back to overview</Link>
    </div>
  );
}
