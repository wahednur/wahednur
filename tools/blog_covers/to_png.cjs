// Renders each SVG cover to a 1200x630 PNG (social previews do not support SVG).
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const fs = require("fs"), path = require("path");
(async () => {
  const dir = path.resolve(__dirname, "../../frontend/public/blog");
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".svg"))) {
    await p.goto("file://" + path.join(dir, f));
    await p.screenshot({ path: path.join(dir, f.replace(".svg", ".png")) });
  }
  await b.close();
})();
