import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Markdown from "@/components/Markdown";
import { Badge, Button, Card, field, Loading, Notice, PageHeader, useLoad } from "@/components/ui";
import { api, SITE_URL } from "@/lib/http";
import type { Page } from "@/lib/types";

const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
const SEO_LABEL: Record<Page["seo_source"], string> = {
  none: "Not written yet",
  rule: "Written by the generator (rule based)",
  ai: "Written by the generator (AI rephrasing your own words)",
  manual: "Written by you",
};

type Draft = Pick<Page, "kind" | "slug" | "title" | "excerpt" | "body" | "status" | "cover_image" | "cover_alt">;
const blank: Draft = { kind: "post", slug: "", title: "", excerpt: "", body: "", status: "draft", cover_image: "", cover_alt: "" };

export default function ContentEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const loaded = useLoad<Page>(id ? `/cms/manage/${id}/` : "");
  const { error, reload } = loaded;
  const page = id ? loaded.data : null;
  const [d, setD] = useState<Draft>(blank);
  const [slugTouched, setSlugTouched] = useState(false);
  const [seo, setSeo] = useState({ title: "", description: "" });
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id || !page) return;
    setD({ kind: page.kind, slug: page.slug, title: page.title, excerpt: page.excerpt, body: page.body, status: page.status, cover_image: page.cover_image, cover_alt: page.cover_alt });
    setSeo({ title: page.seo_title, description: page.seo_description });
    setSlugTouched(true); // once saved, the address stays put so links never break
  }, [id, page]);

  async function save(status?: Draft["status"]) {
    setBusy(true);
    setMsg("");
    setOk("");
    const body = { ...d, ...(status ? { status } : {}) };
    const r = await api<Page>(id ? "PUT" : "POST", id ? `/cms/manage/${id}/` : "/cms/manage/", body);
    setBusy(false);
    if (!r.ok || !r.data) return setMsg(r.error);
    setOk(status === "published" ? "Published." : status === "draft" ? "Saved as a draft." : "Saved.");
    if (!id) nav(`/content/${r.data.id}`, { replace: true });
    else reload();
  }
  async function remove() {
    if (!confirm("Delete this post? It disappears from the website.")) return;
    const r = await api("DELETE", `/cms/manage/${id}/`);
    if (!r.ok) return setMsg(r.error);
    nav("/content");
  }
  async function seoAction(path: "seo" | "seo/auto") {
    setMsg("");
    setOk("");
    const r = await api("POST", `/cms/manage/${id}/${path}/`, path === "seo" ? seo : {});
    if (!r.ok) return setMsg(r.error);
    setOk(path === "seo" ? "Your search text is saved and locked." : "The generator will write it again.");
    reload();
  }

  if (id && error) return <Notice>{error}</Notice>;
  if (id && !page) return <Loading />;
  const set = (p: Partial<Draft>) => setD({ ...d, ...p });
  const live = page?.status === "published";
  const url = d.kind === "post" ? `/blog/${d.slug}` : `/${d.slug}`;
  const coverSrc = d.cover_image.startsWith("/") && SITE_URL ? `${SITE_URL}${d.cover_image}` : d.cover_image;

  return (
    <>
      <Link to="/content" className="text-sm text-muted hover:text-brand">← Content</Link>
      <div className="mt-3">
        <PageHeader
          title={id ? "Edit" : "New post"}
          intro={live && SITE_URL ? `Live at ${SITE_URL}${url}` : "Drafts are visible only to you."}
          action={page && <Badge value={page.status} />}
        />
      </div>
      {msg && <div className="mb-4"><Notice>{msg}</Notice></div>}
      {ok && <div className="mb-4"><Notice kind="ok">{ok}</Notice></div>}

      <div className="space-y-5">
        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">Title
            <input value={d.title} maxLength={200} className={field} onChange={(e) => set({ title: e.target.value, slug: slugTouched ? d.slug : slugify(e.target.value) })} />
          </label>
          <label className="text-sm">Address
            <input value={d.slug} maxLength={120} className={field} onChange={(e) => { setSlugTouched(true); set({ slug: slugify(e.target.value) }); }} />
            <span className="mt-1 block font-mono text-[11px] text-muted">{url}</span>
          </label>
          <label className="text-sm">Kind
            <select value={d.kind} className={field} onChange={(e) => set({ kind: e.target.value as Draft["kind"] })}>
              <option value="post">Blog post</option>
              <option value="page">Page</option>
            </select>
          </label>
          <label className="text-sm sm:col-span-2">Short summary (used as the description if you do not write one)
            <input value={d.excerpt} maxLength={300} className={field} onChange={(e) => set({ excerpt: e.target.value })} />
          </label>
          <label className="text-sm">Cover picture (path like /blog/name.svg, or an https address)
            <input value={d.cover_image} maxLength={300} className={field} onChange={(e) => set({ cover_image: e.target.value })} />
          </label>
          <label className="text-sm">What the picture shows (for screen readers and search)
            <input value={d.cover_alt} maxLength={200} className={field} onChange={(e) => set({ cover_alt: e.target.value })} />
          </label>
          {coverSrc && <img src={coverSrc} alt="" className="max-h-40 rounded-lg border border-line sm:col-span-2" />}
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <label className="text-sm">Content (Markdown: ## heading, **bold**, lists, tables, &gt; In short box)
              <textarea rows={22} value={d.body} className={`${field} font-mono`} onChange={(e) => set({ body: e.target.value })} />
            </label>
          </Card>
          <Card className="p-5">
            <p className="mb-3 text-sm text-muted">Preview</p>
            <div className="max-h-[34rem] overflow-auto"><Markdown>{d.body || "Nothing to preview yet."}</Markdown></div>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button disabled={busy || !d.title || !d.slug} onClick={() => save()}>Save</Button>
          {d.status !== "published" && <Button tone="brand" disabled={busy || !d.title || !d.slug} onClick={() => save("published")}>Publish</Button>}
          {live && <Button disabled={busy} onClick={() => save("draft")}>Unpublish</Button>}
          {id && <Button tone="danger" onClick={remove}>Delete</Button>}
        </div>

        {page && live && (
          <Card className="space-y-3 p-5 text-sm">
            <h2 className="font-semibold">Search engine text</h2>
            <p className="text-xs text-muted">
              {SEO_LABEL[page.seo_source]}
              {page.seo_stale && !page.seo_locked && " · updating…"}
              {page.seo_locked && " · locked: edits to the page will not change it"}
            </p>
            <label className="block">Title ({seo.title.length}/60)
              <input maxLength={80} value={seo.title} className={field} onChange={(e) => setSeo({ ...seo, title: e.target.value })} />
            </label>
            <label className="block">Description ({seo.description.length}/155)
              <textarea rows={3} maxLength={200} value={seo.description} className={field} onChange={(e) => setSeo({ ...seo, description: e.target.value })} />
            </label>
            <div className="flex flex-wrap gap-3">
              <Button tone="brand" onClick={() => seoAction("seo")}>Use my text (lock)</Button>
              <Button onClick={() => seoAction("seo/auto")}>Let the generator write it</Button>
            </div>
            <p className="text-xs text-muted">The generator only rephrases what is on the page. It never adds facts and rewrites the text itself when you change the page.</p>
          </Card>
        )}
      </div>
    </>
  );
}
