import Link from "next/link";

export default function AuthShell({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <div className="rounded-xl border border-line bg-surface p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {intro && <p className="mt-2 text-sm leading-6 text-muted">{intro}</p>}
        <div className="mt-6 space-y-5">{children}</div>
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        {footer ?? (
          <Link href="/" className="hover:text-ink">
            ← Back to the site
          </Link>
        )}
      </p>
    </div>
  );
}
