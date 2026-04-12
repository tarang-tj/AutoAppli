import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-zinc-500">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-white">Page not found</h1>
      <p className="mt-2 max-w-md text-zinc-400 text-sm">
        The link may be broken or the page was removed.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
