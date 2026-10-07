import ReactMarkdown from "react-markdown";

/** Renders Markdown without raw HTML (react-markdown ignores it), so content cannot inject scripts. */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-5 leading-8 text-ink/90">
      <ReactMarkdown
        components={{
          h1: (p) => <h2 className="mt-10 text-3xl font-semibold tracking-tight" {...p} />,
          h2: (p) => <h2 className="mt-10 text-2xl font-semibold tracking-tight" {...p} />,
          h3: (p) => <h3 className="mt-8 text-xl font-semibold" {...p} />,
          a: ({ href, ...p }) => (
            <a
              href={href}
              className="text-brand underline underline-offset-4"
              {...(href?.startsWith("http") ? { rel: "noopener noreferrer nofollow", target: "_blank" } : {})}
              {...p}
            />
          ),
          ul: (p) => <ul className="list-disc space-y-2 pl-6" {...p} />,
          ol: (p) => <ol className="list-decimal space-y-2 pl-6" {...p} />,
          blockquote: (p) => <blockquote className="border-l-2 border-brand pl-4 text-muted" {...p} />,
          code: (p) => <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-sm" {...p} />,
          pre: (p) => <pre className="overflow-x-auto rounded-xl border border-line bg-surface p-4 text-sm" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
