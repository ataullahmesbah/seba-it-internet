import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="card mx-auto max-w-lg p-10 text-center">
      <h1 className="text-xl font-bold">Not found</h1>
      <p className="mt-2 text-sm text-muted">This page or record does not exist.</p>
      <Link href="/admin" className="btn-primary mt-6">Back to overview</Link>
    </div>
  );
}
