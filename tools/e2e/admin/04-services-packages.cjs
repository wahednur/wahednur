const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const URL = 'http://localhost:5173';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  p.on('dialog', d => d.accept());
  await p.goto(URL + '/login');
  await p.fill('input[name=email]', 'boss@example.com'); await p.fill('input[name=password]', 'a-very-long-pass-123'); await p.click('button[type=submit]');
  await p.waitForSelector('h1:has-text("Overview")', { timeout: 20000 });
  await p.click('nav >> text=Services & packages'); await p.click('button:has-text("New service")');
  await p.fill('input[name=title]', 'Admin dashboards'); await p.fill('input[name=summary]', 'Clear tools for daily work');
  await p.check('input[name=published]'); await p.click('button:has-text("Save service")');
  await p.waitForSelector('text=Service saved'); await p.click('button[aria-expanded]');
  await p.click('button:has-text("Add package")');
  await p.fill('input[name=name]', 'Basic'); await p.fill('textarea[name=features]', 'Tables and filters\nUser permissions');
  await p.fill('input[name=price]', '300'); await p.fill('input[name=delivery_days]', '14'); await p.fill('input[name=revisions]', '2');
  await p.check('input[name=published]'); await p.click('button:has-text("Save package")');
  await p.waitForSelector('text=Package saved'); await p.waitForSelector('text=$300.00');
  ok((await p.locator('body').innerText()).includes('14 days'), 'USD package saved with 14 days');
  let pub = await (await fetch('http://localhost:8000/api/catalog/services/')).json();
  ok(JSON.stringify(pub).includes('Basic') && JSON.stringify(pub).includes('Tables and filters'), 'the public price list shows it');
  // BDT package, hidden
  await p.click('button:has-text("Add package")'); await p.fill('input[name=name]', 'Basic (BDT)'); await p.fill('input[name=price]', '30000'); await p.selectOption('select[name=currency]', 'BDT'); await p.click('button:has-text("Save package")');
  await p.waitForSelector('text=৳30,000.00');
  pub = await (await fetch('http://localhost:8000/api/catalog/services/')).json();
  ok(!JSON.stringify(pub).includes('BDT)'), 'a hidden package is not public');
  // zero price refused
  await p.click('button:has-text("Add package")'); await p.fill('input[name=name]', 'Free'); await p.fill('input[name=price]', '0'); await p.click('button:has-text("Save package")');
  await p.waitForSelector('[role=alert]'); ok(true, 'a zero price is refused');
  await p.click('button:has-text("Cancel")');
  // edit price
  await p.locator('div:has(> div > p:text-is("Basic"))').first().locator('button:has-text("Edit")').click();
  await p.fill('input[name=price]', '350'); await p.click('button:has-text("Save package")'); await p.waitForSelector('text=$350.00');
  ok(true, 'price edited to $350');
  await p.screenshot({ path: (process.env.E2E_TMP || '/tmp') + '/shot.png', fullPage: true });
  await p.locator('div:has(> div > p:text-is("Basic (BDT)"))').first().locator('button:has-text("Delete")').click();
  await p.waitForSelector('text=Package deleted'); ok(true, 'package deleted');
  await b.close();
})().catch(e => { console.log('ERROR', e.message.split('\n').slice(0, 4).join(' | ')); process.exitCode = 1; });
