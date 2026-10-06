"use client";

import { useRef, useState } from "react";
import { budgets, needs, timelines } from "@/lib/leadOptions";
import { site } from "@/lib/site";

// Set in the host environment. Without it the form falls back to opening the
// visitor's email app, so the site still works before the API is deployed.
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "mailto" }
  | { kind: "error"; message: string; fields?: Record<string, string> };

const field =
  "mt-2 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none aria-[invalid=true]:border-red-400";

function labelOf(list: readonly { value: string; label: string }[], v: string) {
  return list.find((i) => i.value === v)?.label ?? v;
}

export default function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.kind === "sending") return;
    const d = new FormData(e.currentTarget);
    const get = (k: string) => String(d.get(k) ?? "").trim();

    if (!API_URL) {
      const subject = `Project enquiry: ${labelOf(needs, get("need"))}`;
      const body = [
        `Name: ${get("name")}`,
        `Email: ${get("email")}`,
        `Need: ${labelOf(needs, get("need"))}`,
        `Budget: ${get("budget") ? labelOf(budgets, get("budget")) : "-"}`,
        `Timeline: ${get("timeline") ? labelOf(timelines, get("timeline")) : "-"}`,
        "",
        get("details"),
      ].join("\n");
      window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      setState({ kind: "mailto" });
      return;
    }

    setState({ kind: "sending" });
    try {
      const res = await fetch(`${API_URL}/api/leads/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: get("name"),
          email: get("email"),
          need: get("need"),
          details: get("details"),
          budget: get("budget"),
          timeline: get("timeline"),
          website: get("website"), // honeypot, stays empty for real visitors
        }),
      });

      if (res.status === 201) {
        formRef.current?.reset();
        setState({ kind: "sent" });
        return;
      }
      if (res.status === 400) {
        const data = (await res.json().catch(() => ({}))) as Record<string, string[]>;
        const fields: Record<string, string> = {};
        for (const [k, v] of Object.entries(data)) {
          if (Array.isArray(v) && v[0]) fields[k] = v[0];
        }
        setState({
          kind: "error",
          message: "Please check the highlighted fields.",
          fields,
        });
        return;
      }
      if (res.status === 429) {
        setState({
          kind: "error",
          message: "Too many messages from your network. Please try again later.",
        });
        return;
      }
      setState({ kind: "error", message: "Something went wrong on my side." });
    } catch {
      setState({ kind: "error", message: "I could not reach the server." });
    }
  }

  const fieldErrors = state.kind === "error" ? (state.fields ?? {}) : {};
  const sending = state.kind === "sending";

  if (state.kind === "sent") {
    return (
      <div className="rounded-xl border border-brand/40 bg-surface p-8" role="status">
        <h2 className="text-xl font-semibold">Message received</h2>
        <p className="mt-2 text-muted">
          Thank you. I will reply to the email address you gave, usually within
          a couple of working days.
        </p>
        <button
          type="button"
          onClick={() => setState({ kind: "idle" })}
          className="mt-5 text-sm font-medium text-brand hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  const err = (name: string) =>
    fieldErrors[name] ? (
      <span id={`${name}-error`} className="mt-1 block text-xs text-red-400">
        {fieldErrors[name]}
      </span>
    ) : null;
  const a11y = (name: string) => ({
    "aria-invalid": fieldErrors[name] ? true : undefined,
    "aria-describedby": fieldErrors[name] ? `${name}-error` : undefined,
  });

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">Name</span>
          <input name="name" required maxLength={120} autoComplete="name" className={field} {...a11y("name")} />
          {err("name")}
        </label>
        <label className="block text-sm">
          <span className="font-medium">Email</span>
          <input name="email" type="email" required maxLength={254} autoComplete="email" className={field} {...a11y("email")} />
          {err("email")}
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium">What do you need?</span>
        <select name="need" required defaultValue="" className={field} {...a11y("need")}>
          <option value="" disabled>
            Choose one
          </option>
          {needs.map((n) => (
            <option key={n.value} value={n.value}>
              {n.label}
            </option>
          ))}
        </select>
        {err("need")}
      </label>
      <label className="block text-sm">
        <span className="font-medium">Tell me about it</span>
        <textarea
          name="details"
          required
          minLength={10}
          maxLength={5000}
          rows={5}
          placeholder="What does the business do, and what problem should this solve?"
          className={field}
          {...a11y("details")}
        />
        {err("details")}
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">Budget (optional)</span>
          <select name="budget" defaultValue="" className={field}>
            <option value="">Prefer not to say</option>
            {budgets.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Timeline (optional)</span>
          <select name="timeline" defaultValue="" className={field}>
            <option value="">Prefer not to say</option>
            {timelines.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Honeypot: invisible to people and screen readers, bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <button
        type="submit"
        disabled={sending}
        className="rounded-md bg-brand px-5 py-3 text-sm font-semibold text-bg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {sending ? "Sending…" : API_URL ? "Send message" : "Send by email"}
      </button>

      <div aria-live="polite" className="text-sm">
        {state.kind === "error" && (
          <p role="alert" className="text-red-400">
            {state.message}{" "}
            <a href={`mailto:${site.email}`} className="underline">
              You can also email {site.email}
            </a>
            .
          </p>
        )}
        {state.kind === "mailto" && (
          <p className="text-muted">
            Your email app should open with the message filled in. If it did not, write to{" "}
            {site.email}.
          </p>
        )}
        {state.kind === "idle" && !API_URL && (
          <p className="text-muted">This opens your email app with the message ready to send.</p>
        )}
      </div>
    </form>
  );
}
