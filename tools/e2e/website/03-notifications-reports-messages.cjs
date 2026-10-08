const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
// Needs: website :3000, API :8000, client@example.com with one project whose steps and a published daily report were made
// by the seed in this folder's README, and PROJECT set to that project's id.
const WEB = 'http://localhost:3000';
const PROJECT = process.env.PROJECT;
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto(WEB + '/login');
  await p.fill('input[type=email]', 'client@example.com'); await p.fill('input[type=password]', 'a-very-long-pass-123'); await p.click('button[type=submit]');
  await p.waitForURL('**/app', { timeout: 30000 });
  await p.waitForSelector('button[aria-label^="Notifications, "]');
  ok(true, 'the bell shows an unread count');
  await p.click('button[aria-label^="Notifications"]'); await p.waitForSelector('text=Daily report: Online shop');
  ok(await p.locator('text=Milestone completed').count() >= 1, 'the bell lists the finished step and the daily report');
  await p.click('text=Daily report: Online shop >> nth=0'); await p.waitForURL('**/app/projects/**');
  await p.waitForSelector('text=1 of 4 steps finished');
  ok(true, 'the project page shows how many steps are finished');
  ok(await p.locator('section[aria-label="Project steps"] li').count() === 4, 'all four steps are drawn');
  await p.waitForSelector('text=Built the product list');
  ok(await p.locator('text=Start the checkout page').count() === 1 && await p.locator('text=6 hours today').count() === 1, 'the work history shows what was done, what is next and the hours');
  await p.goto(WEB + '/app/messages'); await p.waitForSelector('textarea');
  await p.fill('textarea', 'Can we add a bKash option?'); await p.click('button:has-text("Send")');
  await p.waitForSelector('text=Can we add a bKash option?');
  ok(true, 'a message can be sent');
  await p.goto(WEB + '/app/settings'); await p.waitForSelector('button[role=switch]');
  ok(await p.locator('button[role=switch]').count() === 2, 'the settings page has the email and browser switches');
  await p.goto(WEB + '/app/notifications'); await p.waitForSelector('h1:has-text("Notifications")');
  await p.click('button:has-text("Mark all read")');
  await p.waitForSelector('button[aria-label="Notifications"]');
  ok(true, 'marking everything read clears the bell');
  await b.close();
})().catch(e => { console.log('ERROR', e.message.split('\n').slice(0, 4).join(' | ')); process.exitCode = 1; });
