export default function PageHero({
  label,
  title,
  intro,
}: {
  label: string;
  title: string;
  intro?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">{label}</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
          {title}
        </h1>
        {intro && <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">{intro}</p>}
      </div>
    </section>
  );
}
