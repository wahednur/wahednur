const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const URL = 'http://localhost:5173';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await (await b.newContext({ viewport: { width: 1280, height: 1300 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  p.on('dialog', d => d.accept());
  await p.goto(URL + '/login');
  await p.fill('input[name=email]', 'boss@example.com'); await p.fill('input[name=password]', 'a-very-long-pass-123'); await p.click('button[type=submit]');
  await p.waitForSelector('h1:has-text("Overview")', { timeout: 20000 });

  // tax rate
  await p.click('nav >> text=Billing'); await p.click('button[role=tab]:has-text("Tax rates")'); await p.click('button:has-text("New tax rate")');
  await p.fill('input[name=name]', 'VAT'); await p.fill('input[name=rate]', '15'); await p.click('button:has-text("Save")'); await p.waitForSelector('td:has-text("VAT")');
  ok(true, 'tax rate VAT 15% added');

  // quote with a brand new foreign client made in a window
  await p.click('button[role=tab]:has-text("Invoices")'); await p.click('button:has-text("New quote")');
  await p.waitForSelector('h1:has-text("New quote / proposal / estimate")');
  await p.click('button[aria-haspopup=listbox]'); await p.waitForSelector('text=No customer found');
  await p.click('button:has-text("+ New client")'); await p.waitForSelector('[role=dialog]');
  await p.click('label:has-text("Foreign client")'); await p.fill('[role=dialog] input[name=email]', 'ann@acme.test'); await p.fill('[role=dialog] input[name=full_name]', 'Ann Buyer'); await p.fill('[role=dialog] input[name=company]', 'Acme Inc'); await p.fill('[role=dialog] input[name=address]', '5 Main St, London');
  await p.click('[role=dialog] button:has-text("Create client")');
  await p.waitForSelector('[role=dialog]', { state: 'detached', timeout: 15000 });
  await p.waitForSelector('text=this document is billed in USD', { timeout: 15000 });
  ok(true, 'client created in a window and selected; document is USD');
  { const a = await p.locator('textarea').first().inputValue(); ok(a.includes('5 Main St'), 'address filled from the client: ' + JSON.stringify(a)); }
  ok((await p.locator('input[placeholder^="QUO-"]').count()) === 1, 'next quote number is shown as a hint');
  await p.fill('input[maxlength="200"]', 'Online shop build');
  await p.fill('input[aria-label=Description]', 'Storefront'); await p.fill('input[aria-label="Unit price"]', '1000');
  await p.click('button:has-text("+ Add item")');
  await p.locator('input[aria-label=Description]').nth(1).fill('Admin panel'); await p.locator('input[aria-label=Quantity]').nth(1).fill('2'); await p.locator('input[aria-label="Unit price"]').nth(1).fill('250');
  await p.selectOption('main aside select >> nth=0', { label: 'VAT (15%)' });
  await p.selectOption('select[aria-label="Discount type"]', 'percent'); await p.fill('input[aria-label=Discount]', '10');
  const sum = await p.locator('main aside').innerText();
  ok(sum.includes('$1,500.00') && sum.includes('$150.00') && sum.includes('$202.50') && sum.includes('$1,552.50'), 'live summary: 1500 - 10% + VAT 15% = $1,552.50');
  await p.fill('textarea[placeholder^="What you will build"]', 'We will build a fast online shop.');
  await p.selectOption('select >> nth=-1', 'sent').catch(() => {});
  await p.locator('label:has-text("Status") select').selectOption('sent');
  await p.click('button:has-text("Save and deliver")');
  await p.waitForSelector('text=QUO-', { timeout: 15000 });
  const q = await p.locator('body').innerText();
  ok(q.includes('delivered') && q.includes('$1,552.50') && q.includes('VAT (15%)') && q.includes('5 Main St') && q.includes('We will build'), 'quote saved as Delivered with tax, address and proposal');
  await p.selectOption('select[aria-label="Change status"]', 'accept'); await p.waitForSelector('button:has-text("Create invoice")');
  ok(true, 'status changed to Accepted');
  await p.click('button:has-text("Create invoice")'); await p.click('button:has-text("Create draft invoice")'); await p.waitForSelector('text=INV-', { timeout: 15000 });
  const inv = await p.locator('body').innerText();
  ok(inv.includes('$621.00') && inv.includes('$465.75') && inv.includes('$1,552.50'), 'invoice: 40/30/30 of the tax-inclusive total = 621.00 / 465.75 / 465.75');

  // duplicate custom number refused
  await p.goto(URL + '/billing/new/quote'.replace('quote', 'quotation'));
  await p.waitForSelector('h1:has-text("New quote")');
  await p.click('button[aria-haspopup=listbox]'); await p.click('[role=option]');
  await p.fill('input[maxlength="200"]', 'Second'); await p.fill('input[aria-label=Description]', 'Work'); await p.fill('input[aria-label="Unit price"]', '10');
  await p.fill('input[placeholder^="QUO-"]', 'ACME-1'); await p.click('button:has-text("Save as draft")'); await p.waitForSelector('text=ACME-1', { timeout: 10000 });
  await p.goto(URL + '/billing/new/quotation'); await p.click('button[aria-haspopup=listbox]'); await p.click('[role=option]');
  await p.fill('input[maxlength="200"]', 'Third'); await p.fill('input[aria-label=Description]', 'Work'); await p.fill('input[aria-label="Unit price"]', '10');
  await p.fill('input[placeholder^="QUO-"]', 'acme-1'); await p.click('button:has-text("Save as draft")'); await p.waitForSelector('[role=alert]');
  ok((await p.locator('[role=alert]').innerText()).includes('already used'), 'a number already used is refused');

  // recurring
  await p.goto(URL + '/billing/new/recurring'); await p.waitForSelector('h1:has-text("New recurring invoice")');
  await p.click('button[aria-haspopup=listbox]'); await p.click('[role=option]');
  await p.fill('input[maxlength="200"]', 'Monthly care plan'); await p.fill('input[aria-label=Description]', 'Maintenance'); await p.fill('input[aria-label="Unit price"]', '300');
  await p.selectOption('main aside select >> nth=0', { label: 'VAT (15%)' });
  await p.check('input[type=checkbox]'); await p.click('button:has-text("Create schedule")');
  await p.waitForSelector('text=Monthly care plan', { timeout: 15000 });
  const rc = await p.locator('body').innerText();
  ok(rc.includes('$345.00') && rc.includes('every month') && rc.includes('issued and emailed automatically'), 'recurring schedule: $300 + VAT = $345.00 every month, auto-issue');
  await p.click('button:has-text("Pause")'); await p.waitForSelector('button:has-text("Resume")'); await p.click('button:has-text("Resume")'); await p.waitForSelector('button:has-text("Pause")');
  ok(true, 'pause and resume');
  await p.screenshot({ path: (process.env.E2E_TMP || '/tmp') + '/recurring.png' });
  await b.close();
})().catch(e => { console.log('ERROR', e.message.split('\n').slice(0, 5).join(' | ')); process.exitCode = 1; });
