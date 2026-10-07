// Takes the screenshots listed in shots.config.json.
// Usage: npm run shoot -- [--only a,b] [--site store] [--webp] [--headed] [--list]
//        [--allow-pii] [--allow-submit] [--config file] [--chromium-path path]
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import {
  findPII,
  kb,
  loadConfig,
  maskValue,
  parseArgs,
  root,
  runSteps,
  settle,
} from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const cfg = await loadConfig(args.config);
const settings = {
  outputDir: "output",
  navTimeoutMs: 45000,
  actionTimeoutMs: 15000,
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2 },
  allowText: [],
  blockHosts: [],
  ...cfg.settings,
};

let shots = cfg.shots.filter((s) => s.enabled !== false);
if (args.only) {
  const wanted = new Set(String(args.only).split(","));
  shots = shots.filter((s) => wanted.has(s.name));
}
if (args.site) shots = shots.filter((s) => s.site === args.site);

if (args.list) {
  for (const s of cfg.shots)
    console.log(
      `${s.enabled === false ? "(off)" : "     "} ${s.name.padEnd(28)} ${s.site.padEnd(8)} ${s.viewport ?? "desktop"}`,
    );
  process.exit(0);
}
if (shots.length === 0) {
  console.error("No shots selected. Run: npm run list");
  process.exit(1);
}

let sharp = null;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.warn("sharp is not installed: skipping image sizes and WebP.");
}

const outDir = path.resolve(root, settings.outputDir);
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: !args.headed,
  slowMo: args.headed ? 250 : 0,
  executablePath: args["chromium-path"] || process.env.CHROMIUM_PATH || undefined,
});

const results = [];
for (const shot of shots) {
  const site = cfg.sites[shot.site];
  const vp = settings[shot.viewport ?? "desktop"];
  const row = { name: shot.name, status: "ok", note: "" };
  results.push(row);

  let storageState;
  if (site.auth) {
    const file = path.join(root, ".auth", `${shot.site}.json`);
    try {
      await fs.access(file);
      storageState = file;
    } catch {
      row.status = "skipped";
      row.note = `not logged in. Run: npm run login -- ${shot.site}`;
      continue;
    }
  }

  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
    isMobile: shot.viewport === "mobile",
    hasTouch: shot.viewport === "mobile",
    reducedMotion: "reduce",
    storageState,
  });
  // Keep my own visits out of the sites' analytics and ad pixels.
  if (settings.blockHosts.length) {
    await context.route(
      (url) => settings.blockHosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`)),
      (route) => route.abort(),
    );
  }

  try {
    const page = await context.newPage();
    await runSteps(page, site, shot.steps, {
      timeout: settings.navTimeoutMs,
      actionTimeout: settings.actionTimeoutMs ?? 15000,
      allowSubmit: Boolean(args["allow-submit"]),
    });
    await settle(page, shot.fullPage);

    // Cosmetic CSS: no animations, hide noise, blur private areas.
    const css = [
      "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
      ...(shot.hide ?? []).map((s) => `${s}{visibility:hidden!important}`),
      ...(shot.blur ?? []).map((s) => `${s}{filter:blur(10px)!important}`),
    ].join("\n");
    await page.addStyleTag({ content: css });

    // Privacy check: read what is visible (blurred and hidden parts excluded)
    // and stop if a phone number or email that is not allow-listed shows up.
    const visibleText = await page.evaluate(
      ({ blur, hide }) => {
        const els = [];
        for (const sel of [...blur, ...hide]) {
          try {
            els.push(...document.querySelectorAll(sel));
          } catch {
            /* invalid selector: ignored */
          }
        }
        const old = els.map((e) => e.style.visibility);
        els.forEach((e) => (e.style.visibility = "hidden"));
        const fields = [...document.querySelectorAll("input,textarea")]
          .filter((f) => f.type !== "password")
          .map((f) => f.value)
          .join("\n");
        const text = `${document.body.innerText}\n${fields}`;
        els.forEach((e, i) => (e.style.visibility = old[i]));
        return text;
      },
      { blur: shot.blur ?? [], hide: shot.hide ?? [] },
    );
    const pii = findPII(visibleText, [...settings.allowText, ...(shot.allowText ?? [])]);
    if (pii.length && !args["allow-pii"]) {
      row.status = "BLOCKED";
      row.note = `private data visible: ${pii.map(maskValue).join(", ")}. Add its selector to "blur", or add it to "allowText" if it is your own public contact.`;
      continue;
    }

    const file = path.join(outDir, `${shot.name}.png`);
    await page.screenshot({ path: file, fullPage: Boolean(shot.fullPage), animations: "disabled" });

    const stat = await fs.stat(file);
    row.bytes = stat.size;
    if (sharp) {
      const meta = await sharp(file).metadata();
      row.size = `${meta.width}x${meta.height}`;
      if (args.webp) {
        const webp = file.replace(/\.png$/, ".webp");
        await sharp(file).webp({ quality: 82 }).toFile(webp);
        row.webpBytes = (await fs.stat(webp)).size;
      }
    }
    const best = row.webpBytes ?? row.bytes;
    if (best > 400 * 1024) row.note = "large file: consider --webp";
  } catch (e) {
    row.status = "FAILED";
    row.note = e.message.split("\n")[0];
  } finally {
    await context.close();
  }
}
await browser.close();

console.log("");
for (const r of results) {
  const sizes = r.bytes
    ? `${r.size ?? ""} png ${kb(r.bytes)}${r.webpBytes ? ` webp ${kb(r.webpBytes)}` : ""}`
    : "";
  console.log(`${r.status.padEnd(8)} ${r.name.padEnd(26)} ${sizes} ${r.note}`);
}
await fs.writeFile(path.join(outDir, "manifest.json"), JSON.stringify(results, null, 2));

const bad = results.filter((r) => r.status !== "ok");
console.log(`\n${results.length - bad.length}/${results.length} saved to ${settings.outputDir}/`);
if (bad.length) {
  console.log("Not saved: see the notes above.");
  process.exitCode = 1;
}
