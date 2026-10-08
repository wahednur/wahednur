"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "@/components/Markdown";
import { Alert } from "@/components/auth/ui";
import { btn, field, ghost, Badge } from "@/components/app/billing/Bits";
import { api, SEO_SOURCE_LABEL, type ManagedPage } from "@/lib/api";

const slugify = (t: string) =>
  t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);

type Draft = Pick<ManagedPage, "kind" | "slug" | "title" | "excerpt" | "body" | "status" | "cover_image" | "cover_alt">;
const blank: Draft = { kind: "post", slug: "", title: "", excerpt: "", body: "", status: "draft", cover_image: "", cover_alt: "" };

export default function ContentManager() {
  const [pages, setPages] = useState<ManagedPage[] | null>(null);
  const [current, setCurrent] = useState<ManagedPage | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [seoHand, setSeoHand] = useState({ title: "", description: "" });
  const [tick, setTick] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api<ManagedPage[]>("GET", "/cms/manage/").then((r) => (r.ok ? setPages(r.data) : setError(r.error)));
  }, [tick]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  function open(p: ManagedPage | null) {
    setCurrent(p);
    setDraft(p ? { kind: p.kind, slug: p.slug, title: p.title, excerpt: p.excerpt, body: p.body, status: p.status, cover_image: p.cover_image, cover_alt: p.cover_alt } : blank);
    setSeoHand(p ? { title: p.seo_title, description: p.seo_description } : { title: "", description: "" });
    setSlugTouched(!!p);
    setError("");
    setNote("");
  }

  /** The SEO text is written in the background after saving; look again until it is ready. */
  function watchSeo(id: number, tries = 0) {
    timer.current = setTimeout(async () => {
      const r = await api<ManagedPage>("GET", `/cms/manage/${id}/`);
      if (!r.ok || !r.data) return;
      if (r.data.seo_stale && !r.data.seo_locked && tries < 12) return watchSeo(id, tries + 1);
      setCurrent(r.data);
      setSeoHand({ title: r.data.seo_title, description: r.data.seo_description });
      setNote(r.data.status === "published" ? "SEO text is ready and the website is refreshing." : "Saved.");
      setTick((t) => t + 1);
    }, 1200);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNote("");
    const r = current
      ? await api<ManagedPage>("PUT", `/cms/manage/${current.id}/`, draft)
      : await api<ManagedPage>("POST", "/cms/manage/", draft);
    setBusy(false);
    if (!r.ok || !r.data) return setError(r.error);
    setCurrent(r.data);
    setSlugTouched(true); // once saved, the address stays put: changing the title must not break links
    setTick((t) => t + 1);
    if (r.data.status === "published") {
      setNote("Saved. Writing the SEO text…");
      watchSeo(r.data.id);
    } else setNote("Saved as a draft.");
  }

  async function seoAction(path: string, body?: unknown) {
    if (!current) return;
    setError("");
    const r = await api<ManagedPage>("POST", `/cms/manage/${current.id}/${path}/`, body);
    if (!r.ok || !r.data) return setError(r.error);
    setCurrent(r.data);
    setNote(path === "seo" ? "Your SEO text is saved and locked." : "The generator will write it again…");
    if (path !== "seo") watchSeo(r.data.id);
    setTick((t) => t + 1);
  }

  async function remove() {
    if (!current || !window.confirm("Delete this page? Visitors will no longer see it.")) return;
    const r = await api("DELETE", `/cms/manage/${current.id}/`);
    if (r.ok) {
      open(null);
      setTick((t) => t + 1);
    } else setError(r.error);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <aside aria-label="Pages" className="space-y-3">
        <button type="button" className={btn + " w-full"} onClick={() => open(null)}>
          New page
        </button>
        {pages?.length === 0 && <p className="text-sm text-muted">Nothing written yet.</p>}
        <ul className="divide-y divide-line rounded-xl border border-line">
          {pages?.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => open(p)}
                className={`flex w-full items-center justify-between gap-2 p-3 text-left text-sm hover:bg-surface ${current?.id === p.id ? "bg-surface" : ""}`}
              >
                <span className="truncate">{p.title}</span>
                <Badge value={p.status} />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="space-y-8">
        {error && <Alert>{error}</Alert>}
        {note && <Alert kind="info">{note}</Alert>}
        <form onSubmit={save} className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="sm:col-span-2">
              Title
              <input
                required
                maxLength={200}
                value={draft.title}
                className={field}
                onChange={(e) =>
                  setDraft({ ...draft, title: e.target.value, slug: slugTouched ? draft.slug : slugify(e.target.value) })
                }
              />
            </label>
            <label>
              Type
              <select value={draft.kind} className={field} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Draft["kind"] })}>
                <option value="post">Blog post</option>
                <option value="page">Page</option>
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="sm:col-span-2">
              Address (slug)
              <input
                required
                pattern="[a-z0-9_\-]+"
                value={draft.slug}
                className={field}
                onChange={(e) => {
                  setSlugTouched(true);
                  setDraft({ ...draft, slug: e.target.value });
                }}
              />
            </label>
            <label>
              Status
              <select value={draft.status} className={field} onChange={(e) => setDraft({ ...draft, status: e.target.value as Draft["status"] })}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>
          <label className="block">
            Short summary (optional, used as the description if you do not write one)
            <input maxLength={300} value={draft.excerpt} className={field} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              Cover picture (path like /blog/name.svg, or an https address)
              <input maxLength={300} value={draft.cover_image} className={field} onChange={(e) => setDraft({ ...draft, cover_image: e.target.value })} />
            </label>
            <label className="block">
              What the picture shows (for screen readers and search)
              <input maxLength={200} value={draft.cover_alt} className={field} onChange={(e) => setDraft({ ...draft, cover_alt: e.target.value })} />
            </label>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              Content (Markdown)
              <textarea rows={18} value={draft.body} className={field + " font-mono"} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            </label>
            <div>
              <p>Preview</p>
              <div className="mt-2 max-h-[28rem] overflow-auto rounded-md border border-line p-4">
                {draft.body ? <Markdown>{draft.body}</Markdown> : <p className="text-muted">Nothing to show yet.</p>}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button disabled={busy} className={btn}>
              {busy ? "Saving…" : current ? "Save changes" : "Create"}
            </button>
            {current && (
              <button type="button" className={ghost} onClick={remove}>
                Delete
              </button>
            )}
          </div>
        </form>

        {current && current.status === "published" && (
          <section aria-labelledby="seo" className="space-y-3 rounded-xl border border-line bg-surface p-5 text-sm">
            <h2 id="seo" className="font-semibold">
              Search engine text
            </h2>
            <p className="text-xs text-muted">
              {SEO_SOURCE_LABEL[current.seo_source]}
              {current.seo_stale && !current.seo_locked && " · updating…"}
              {current.seo_locked && " · locked: edits to the page will not change it"}
            </p>
            <label className="block">
              Title ({seoHand.title.length}/60)
              <input maxLength={80} value={seoHand.title} className={field} onChange={(e) => setSeoHand({ ...seoHand, title: e.target.value })} />
            </label>
            <label className="block">
              Description ({seoHand.description.length}/155)
              <textarea rows={3} maxLength={200} value={seoHand.description} className={field} onChange={(e) => setSeoHand({ ...seoHand, description: e.target.value })} />
            </label>
            <div className="flex flex-wrap gap-3">
              <button type="button" className={btn} onClick={() => seoAction("seo", seoHand)}>
                Use my text (lock)
              </button>
              <button type="button" className={ghost} onClick={() => seoAction("seo/auto")}>
                Let the generator write it
              </button>
            </div>
            <p className="text-xs text-muted">
              The generator only rephrases what is already on the page. It never adds facts, and it rewrites the text
              automatically when you change the page.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
