const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const URL = 'http://localhost:5173';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await (await b.newContext({ viewport: { width: 1280, height: 1100 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  p.on('dialog', d => d.accept());
  await p.goto(URL + '/login');
  await p.fill('input[name=email]', 'boss@example.com'); await p.fill('input[name=password]', 'a-very-long-pass-123'); await p.click('button[type=submit]');
  await p.waitForSelector('h1:has-text("Overview")', { timeout: 20000 });
  await p.click('nav >> text=Projects'); await p.click('a:has-text("Online shop")');
  await p.waitForSelector('h2:has-text("Milestones")');
  for (const t of ['Design approved', 'First working version']) { await p.fill('input[name=title]', t); await p.click('button:has-text("Add")'); await p.waitForSelector(`li:has-text("${t}")`); }
  await p.selectOption('select[aria-label="Status of Design approved"]', 'done');
  await p.waitForSelector('[role=progressbar][aria-valuenow="50"]', { timeout: 10000 });
  ok(true, 'one of two milestones done -> progress 50%');
  await p.fill('textarea[name=message]', 'Design approved by the client.'); await p.click('button:has-text("Post update")'); await p.waitForSelector('text=client can see');
  await p.fill('textarea[name=message]', 'Client slow to reply, keep an eye.'); await p.uncheck('input[name=is_public]'); await p.click('button:has-text("Post update")'); await p.waitForSelector('text=internal only');
  ok(true, 'public and internal updates posted');
  await p.click('button:has-text("Edit details")'); await p.fill('input[name=summary]', 'A shop for Acme.'); await p.fill('input[name=due_date]', '2026-12-31'); await p.click('button:has-text("Save")');
  await p.waitForSelector('text=A shop for Acme.'); ok(true, 'details edited');
  await p.locator('li:has-text("First working version") >> button[aria-label^="Remove"]').click();
  await p.waitForSelector(`li:has-text("First working version")`, { state: "detached" });
  await p.waitForSelector('[role=progressbar][aria-valuenow="100"]'); ok(true, 'milestone removed -> progress 100%');
  await p.screenshot({ path: (process.env.E2E_TMP || '/tmp') + '/shot.png', fullPage: true });
  await b.close();
})().catch(e => { console.log('ERROR', e.message.split('\n').slice(0, 4).join(' | ')); process.exitCode = 1; });
