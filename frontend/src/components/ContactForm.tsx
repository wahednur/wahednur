"use client";

import { useState } from "react";
import { site } from "@/lib/site";

const needs = [
  "Online store (eCommerce)",
  "Business management app",
  "Admin dashboard",
  "Backend API or integration",
  "Improve an existing app",
  "Something else",
];
const budgets = ["Not sure yet", "Under $500", "$500 – $1,500", "$1,500 – $5,000", "$5,000+"];
const timelines = ["Flexible", "Within 1 month", "1 – 3 months", "3+ months"];

const field =
  "mt-2 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none";

export default function ContactForm() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const get = (k: string) => String(d.get(k) ?? "").trim();
    const subject = `Project enquiry: ${get("need")}`;
    const body = [
      `Name: ${get("name")}`,
      `Email: ${get("email")}`,
      `Need: ${get("need")}`,
      `Budget: ${get("budget") || "-"}`,
      `Timeline: ${get("timeline") || "-"}`,
      "",
      get("details"),
    ].join("\n");
    window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">Name</span>
          <input name="name" required autoComplete="name" className={field} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Email</span>
          <input name="email" type="email" required autoComplete="email" className={field} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium">What do you need?</span>
        <select name="need" required defaultValue="" className={field}>
          <option value="" disabled>
            Choose one
          </option>
          {needs.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium">Tell me about it</span>
        <textarea
          name="details"
          required
          rows={5}
          placeholder="What does the business do, and what problem should this solve?"
          className={field}
        />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">Budget (optional)</span>
          <select name="budget" defaultValue="" className={field}>
            <option value="">Prefer not to say</option>
            {budgets.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Timeline (optional)</span>
          <select name="timeline" defaultValue="" className={field}>
            <option value="">Prefer not to say</option>
            {timelines.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="submit"
        className="rounded-md bg-brand px-5 py-3 text-sm font-semibold text-bg hover:opacity-90"
      >
        Send by email
      </button>
      <p className="text-sm text-muted" role="status">
        {sent
          ? `Your email app should open with the message filled in. If it did not, write to ${site.email}.`
          : "This opens your email app with the message ready to send."}
      </p>
    </form>
  );
}
