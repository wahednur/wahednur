const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const URL = 'http://localhost:5173';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto(URL + '/');
  await p.waitForURL(/\/login/, { timeout: 20000 });
  ok(true, 'signed-out visitor is sent to /login');
  // a client account is refused
  await p.fill('input[name=email]', 'client@example.com'); await p.fill('input[name=password]', 'a-very-long-pass-123'); await p.click('button[type=submit]');
  await p.waitForSelector('text=not staff', { timeout: 15000 });
  ok(true, 'a client account cannot enter the admin');
  await p.click('text=Sign out').catch(() => {});
  await p.goto(URL + '/login');
  await ctx.clearCookies();
  await p.reload();
  await p.fill('input[name=email]', 'boss@example.com'); await p.fill('input[name=password]', 'a-very-long-pass-123'); await p.click('button[type=submit]');
  await p.waitForSelector('h1:has-text("Overview")', { timeout: 20000 });
  ok(true, 'owner signs in and sees Overview');
  const t0 = await p.locator('body').innerText();
  ok(/Package requests\s*1/.test(t0) || t0.includes('Needs your attention'), 'overview shows the attention list');
  await p.screenshot({ path: (process.env.E2E_TMP || '/tmp') + '/shot.png' });

  await p.click('nav >> text=Projects'); await p.waitForSelector('text=Online shop');
  await p.locator('tr:has-text("Admin tool") >> button:has-text("In progress")').click();
  await p.waitForSelector('tr:has-text("Admin tool") >> text=active', { timeout: 10000 });
  ok(true, 'project moved proposal -> in progress');

  await p.click('nav >> text=Billing'); await p.waitForSelector('text=INV-');
  await p.click('a:has-text("INV-")'); await p.waitForSelector('text=Record a payment');
  await p.fill('input[name=amount]', '200'); await p.click('button:has-text("Record payment")');
  await p.waitForSelector('text=Payment recorded', { timeout: 10000 });
  const bt = await p.locator('body').innerText();
  ok(bt.includes('$300.00'), 'payment of $200 recorded, $300.00 still due');
  await p.fill('input[name=amount]', '999'); await p.click('button:has-text("Record payment")');
  await p.waitForSelector('[role=alert]', { timeout: 10000 });
  ok(true, 'overpayment is refused by the server');
  await p.screenshot({ path: (process.env.E2E_TMP || '/tmp') + '/shot.png' });

  await p.click('nav >> text=Package requests'); await p.waitForSelector('text=Svc: Basic');
  await p.click('button:has-text("Accept")');
  await p.waitForSelector('text=Earlier', { timeout: 10000 });
  ok(true, 'package request accepted');

  await p.click('nav >> text=Content'); await p.waitForSelector('text=Quotation vs invoice');
  await p.locator('tr:has-text("Quotation vs invoice") >> button:has-text("Unpublish")').click();
  await p.waitForSelector('tr:has-text("Quotation vs invoice") >> button:has-text("Publish")', { timeout: 10000 });
  ok(true, 'post unpublished from the admin');

  await p.click('nav >> text=Accounting'); await p.waitForSelector('h1:has-text("Accounting")');
  ok((await p.locator('body').innerText()).includes('$200.00'), 'accounting shows $200.00 received');
  await p.click('nav >> text=Clients'); await p.waitForSelector('text=client@example.com');
  ok(true, 'clients list');

  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto(URL + '/'); await p.waitForSelector('h1:has-text("Overview")');
  ok(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'no sideways overflow on a phone');
  await p.click('button:has-text("Menu")'); await p.waitForSelector('[aria-label=Menu] >> text=Billing');
  await p.screenshot({ path: (process.env.E2E_TMP || '/tmp') + '/shot.png' });
  await p.click('[aria-label=Menu] >> text=Billing'); await p.waitForURL(/\/billing/);
  ok(true, 'phone menu opens and navigates');
  await p.click('button:has-text("Sign out")'); await p.waitForURL(/\/login/);
  ok(true, 'sign out');
  await b.close();
})().catch(e => { console.log('ERROR', e.message.split('\n').slice(0, 4).join(' | ')); process.exitCode = 1; });
