const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
// Needs: website :3000, API :8000 and a verified user client@example.com / a-very-long-pass-123 with no saved addresses.
const WEB = 'http://localhost:3000';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto(WEB + '/login');
  await p.fill('input[type=email]', 'client@example.com'); await p.fill('input[type=password]', 'a-very-long-pass-123'); await p.click('button[type=submit]');
  await p.waitForURL('**/app', { timeout: 30000 });
  // the orders menus stay hidden while there is nothing behind them
  const nav = await p.locator('nav[aria-label=Dashboard]').innerText();
  ok(!/Shop orders|Package requests/.test(nav), 'Shop orders and Package requests are hidden when empty');
  // the avatar menu
  await p.click('button[aria-label="Account menu"]');
  ok(await p.locator('[role=menuitem]:has-text("Profile")').count() === 1 && await p.locator('[role=menuitem]:has-text("Sign out")').count() === 1, 'the avatar menu has Profile and Sign out');
  await p.click('[role=menuitem]:has-text("Profile")'); await p.waitForSelector('h1:has-text("Profile")');
  await p.fill('input[autocomplete=tel]', '01711111111'); await p.click('button:has-text("Save changes")'); await p.waitForSelector('text=Saved.');
  ok(true, 'the profile saves');
  await p.click('button:has-text("Add address")');
  const f = p.locator('form:has(button:has-text("Cancel"))');
  await f.locator('input[autocomplete=name]').fill('Rahim Ahmed'); await f.locator('input[autocomplete=address-line1]').fill('House 4, Road 2'); await f.locator('input[autocomplete=address-level2]').fill('Dhaka');
  await f.locator('button:has-text("Add address")').click(); await p.waitForSelector('li:has-text("House 4, Road 2")');
  ok(await p.locator('li:has-text("House 4") >> text=default').count() === 1, 'the first address is the default');
  await p.reload(); await p.waitForSelector('li:has-text("House 4, Road 2")');
  ok(true, 'it is still there after a reload');
  p.once('dialog', d => d.accept());
  await p.click('li:has-text("House 4") >> button:has-text("Delete")');
  await p.waitForSelector('text=None saved yet.');
  ok(true, 'the address can be deleted');
  await p.click('button[aria-label="Account menu"]'); await p.click('[role=menuitem]:has-text("Sign out")');
  await p.waitForURL('**/login');
  ok(true, 'sign out from the menu returns to the login page');
  await b.close();
})().catch(e => { console.log('ERROR', e.message.split('\n').slice(0, 4).join(' | ')); process.exitCode = 1; });
