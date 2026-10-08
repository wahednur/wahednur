import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Same rules as the website: raw HTML is ignored, so pasted content cannot run scripts. */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-4 text-sm leading-7 text-ink/90">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h2 className="mt-6 text-2xl font-semibold" {...p} />,
          h2: (p) => <h2 className="mt-6 text-xl font-semibold" {...p} />,
          h3: (p) => <h3 className="mt-4 text-lg font-semibold" {...p} />,
          a: ({ href, ...p }) => <a href={href} className="text-brand underline" {...p} />,
          ul: (p) => <ul className="list-disc space-y-1 pl-6" {...p} />,
          ol: (p) => <ol className="list-decimal space-y-1 pl-6" {...p} />,
          blockquote: (p) => <blockquote className="rounded-lg border border-brand/30 bg-brand/5 px-4 py-3" {...p} />,
          code: (p) => <code className="rounded bg-bg px-1 py-0.5 font-mono text-xs" {...p} />,
          table: (p) => <div className="overflow-x-auto"><table className="w-full border-collapse text-left" {...p} /></div>,
          th: (p) => <th className="border-b border-line px-3 py-2 font-semibold" {...p} />,
          td: (p) => <td className="border-b border-line px-3 py-2" {...p} />,
          img: ({ src, alt }) =>
            typeof src === "string" && (src.startsWith("/") || src.startsWith("https://")) ? (
              <img src={src} alt={alt ?? ""} className="w-full rounded-lg border border-line" />
            ) : null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
