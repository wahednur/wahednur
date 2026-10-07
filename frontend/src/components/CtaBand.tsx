import Link from "next/link";

export default function CtaBand({
  title = "Have a project in mind?",
  text = "Tell me what the business needs. I will reply with an honest view on scope and whether I am the right person for it.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-2 max-w-xl text-muted">{text}</p>
        </div>
        <Link
          href="/contact"
          className="shrink-0 rounded-md bg-brand px-5 py-3 text-center text-sm font-semibold text-bg hover:opacity-90"
        >
          Discuss your project
        </Link>
      </div>
    </section>
  );
}
