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
          blockquote: (p) => (
            <blockquote className="rounded-xl border border-brand/30 bg-brand/5 px-5 py-4 text-ink/90 [&>p]:m-0" {...p} />
          ),
          table: (p) => (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[28rem] border-collapse text-left text-sm" {...p} />
            </div>
          ),
          th: (p) => <th className="border-b border-line bg-surface px-4 py-2.5 font-semibold" {...p} />,
          td: (p) => <td className="border-b border-line px-4 py-2.5 align-top" {...p} />,
          img: ({ src, alt }) =>
            typeof src === "string" && (src.startsWith("/") || src.startsWith("https://")) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={alt ?? ""} loading="lazy" className="w-full rounded-xl border border-line" />
            ) : null,
          hr: () => <hr className="border-line" />,
          code: (p) => <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-sm" {...p} />,
          pre: (p) => <pre className="overflow-x-auto rounded-xl border border-line bg-surface p-4 text-sm" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
