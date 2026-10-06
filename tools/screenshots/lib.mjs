import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.dirname(fileURLToPath(import.meta.url));

export function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      args._.push(a);
      continue;
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

export async function loadConfig(file = "shots.config.json") {
  const full = path.resolve(root, file);
  let cfg;
  try {
    cfg = JSON.parse(await fs.readFile(full, "utf8"));
  } catch (e) {
    throw new Error(`Cannot read config ${full}: ${e.message}`);
  }
  const names = new Set();
  for (const s of cfg.shots ?? []) {
    if (!s.name || !/^[a-z0-9][a-z0-9-]*$/.test(s.name))
      throw new Error(`Shot name must be lowercase letters, digits and dashes: "${s.name}"`);
    if (names.has(s.name)) throw new Error(`Duplicate shot name: ${s.name}`);
    names.add(s.name);
    if (!cfg.sites?.[s.site]) throw new Error(`Shot "${s.name}" uses unknown site "${s.site}"`);
    if (!["desktop", "mobile"].includes(s.viewport ?? "desktop"))
      throw new Error(`Shot "${s.name}": viewport must be desktop or mobile`);
    if (!Array.isArray(s.steps) || s.steps.length === 0)
      throw new Error(`Shot "${s.name}" needs at least one step`);
  }
  return cfg;
}

// ---- privacy check ---------------------------------------------------------
const PHONE = /(?<!\d)(?:\+?88)?01[3-9]\d{8}(?!\d)/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

const normPhone = (s) => s.replace(/\D/g, "").replace(/^88/, "").replace(/^0/, "");
const normEmail = (s) => s.toLowerCase();

export function maskValue(v) {
  return v.length <= 6 ? "***" : `${v.slice(0, 3)}…${v.slice(-2)}`;
}

/** Returns phone numbers and emails found in `text` that are not in `allow`. */
export function findPII(text, allow = []) {
  const allowedPhones = new Set(allow.filter((a) => !a.includes("@")).map(normPhone));
  const allowedEmails = new Set(allow.filter((a) => a.includes("@")).map(normEmail));
  const found = new Set();
  const compact = text.replace(/[\s-]/g, "");
  for (const m of compact.matchAll(PHONE)) {
    if (!allowedPhones.has(normPhone(m[0]))) found.add(m[0]);
  }
  for (const m of text.matchAll(EMAIL)) {
    if (!allowedEmails.has(normEmail(m[0]))) found.add(m[0]);
  }
  return [...found];
}

// ---- steps -------------------------------------------------------------------
const SUBMIT_WORDS = /place\s*order|confirm\s*order|submit\s*order|pay\s*now|complete\s*purchase|অর্ডার\s*(করুন|নিশ্চিত)/i;

export function assertSafeClick(selector, allowSubmit) {
  if (!allowSubmit && SUBMIT_WORDS.test(selector))
    throw new Error(
      `Refusing to click "${selector}": it looks like it places an order. These shots run on live sites. Use --allow-submit only if you are sure.`,
    );
}

export async function runSteps(page, site, steps, { timeout, actionTimeout = 15000, allowSubmit }) {
  for (const [i, s] of steps.entries()) {
    const label = `step ${i + 1} (${JSON.stringify(s)})`;
    try {
      if (s.goto !== undefined) {
        await page.goto(new URL(s.goto, site.baseUrl).toString(), {
          waitUntil: "domcontentloaded",
          timeout,
        });
      } else if (s.click !== undefined) {
        assertSafeClick(s.click, allowSubmit);
        await page.locator(s.click).first().click({ timeout: actionTimeout });
      } else if (s.fill !== undefined) {
        await page.locator(s.fill).first().fill(String(s.value ?? ""), { timeout: actionTimeout });
      } else if (s.press !== undefined) {
        await page.keyboard.press(s.press);
      } else if (s.waitFor !== undefined) {
        await page.locator(s.waitFor).first().waitFor({ timeout: actionTimeout });
      } else if (s.wait !== undefined) {
        await page.waitForTimeout(Number(s.wait));
      } else if (s.scroll !== undefined) {
        if (typeof s.scroll === "number")
          await page.evaluate((y) => window.scrollTo(0, y), s.scroll);
        else await page.locator(s.scroll).first().scrollIntoViewIfNeeded({ timeout: actionTimeout });
      } else {
        throw new Error("unknown step type");
      }
    } catch (e) {
      const first = e.message.split("\n")[0];
      if (/Refusing to click/.test(first)) throw e;
      const hint = /Timeout/.test(first)
        ? " Nothing matched in time. Check the selector, or run with --headed to watch."
        : "";
      throw new Error(`${label} failed: ${first}.${hint}`);
    }
  }
}

export async function settle(page, fullPage) {
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  if (fullPage) {
    // Scroll through the page so lazy-loaded images appear, then return to the top.
    await page.evaluate(async () => {
      const step = Math.max(300, window.innerHeight - 100);
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 150));
      }
      window.scrollTo(0, 0);
    });
  }
  await page
    .evaluate(async () => {
      await document.fonts?.ready;
      const pending = [...document.images].filter((i) => !i.complete);
      await Promise.race([
        Promise.all(pending.map((i) => new Promise((r) => (i.onload = i.onerror = r)))),
        new Promise((r) => setTimeout(r, 8000)),
      ]);
    })
    .catch(() => {});
}

export const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
