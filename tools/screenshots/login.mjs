// Saves a logged-in session for a site that needs one (for example the admin).
// Usage: npm run login -- admin
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { chromium } from "playwright";
import { loadConfig, parseArgs, root } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const siteName = args._[0];
const cfg = await loadConfig(args.config);

if (!siteName || !cfg.sites[siteName]?.auth) {
  const choices = Object.entries(cfg.sites)
    .filter(([, s]) => s.auth)
    .map(([n]) => n);
  console.error(`Usage: npm run login -- <site>\nSites that need a login: ${choices.join(", ")}`);
  process.exit(1);
}

const site = cfg.sites[siteName];
const browser = await chromium.launch({
  headless: false,
  executablePath: args["chromium-path"] || process.env.CHROMIUM_PATH || undefined,
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto(new URL(site.loginPath ?? "/", site.baseUrl).toString());

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
await rl.question(
  `\nLog in to ${siteName} in the browser window.\nWhen you can see the dashboard, come back here and press Enter... `,
);
rl.close();

const file = path.join(root, ".auth", `${siteName}.json`);
await fs.mkdir(path.dirname(file), { recursive: true });
await context.storageState({ path: file });
await browser.close();
console.log(`\nSaved to .auth/${siteName}.json (a live session: never share or commit it).`);
console.log("Delete it when you are done:  npm run clean-auth");
