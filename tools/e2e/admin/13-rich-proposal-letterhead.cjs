const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
// Needs the admin on :5173, the API on :8000, boss@example.com (owner) and a customer client@example.com with a local (BDT) type.
const URL = 'http://localhost:5173';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await (await b.newContext({ viewport: { width: 1280, height: 1300 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  p.on('dialog', d => d.accept('https://example.com'));
  await p.goto(URL + '/login');
  await p.fill('input[name=email]', 'boss@example.com'); await p.fill('input[name=password]', 'a-very-long-pass-123'); await p.click('button[type=submit]');
  await p.waitForSelector('h1:has-text("Overview")', { timeout: 20000 });
  await p.goto(URL + '/billing/new/quotation'); await p.waitForSelector('h1:has-text("New quote")');
  await p.click('button[aria-haspopup=listbox]'); await p.fill('[role=listbox] input, input[placeholder*="earch"]', 'client@example.com').catch(() => {});
  await p.click('[role=option]:has-text("client@example.com"), li:has-text("client@example.com")');
  await p.fill('input[maxlength="200"]', 'Online shop proposal');
  await p.fill('input[aria-label=Description]', 'Storefront'); await p.fill('input[aria-label="Unit price"]', '1000');
  // rich text for what the item covers
  await p.click('summary:has-text("Details, time, risk")');
  await p.locator('.doc-rich').nth(1).click(); await p.keyboard.type('Home page and cart');

  // the editor: heading, bold text, a list and a table
  await p.click('.doc-rich');
  await p.click('button[aria-label=Heading]'); await p.keyboard.type('প্রস্তাবনা'); await p.keyboard.press('Enter');
  await p.click('button[aria-label=Bold]'); await p.keyboard.type('Fast shop'); await p.click('button[aria-label=Bold]'); await p.keyboard.type(' for your brand.'); await p.keyboard.press('Enter');
  await p.click('button[aria-label="Bulleted list"]'); await p.keyboard.type('Home page'); await p.keyboard.press('Enter'); await p.keyboard.type('Cart'); await p.keyboard.press('Enter'); await p.keyboard.press('Enter');
  await p.click('button[aria-label="Insert table"]');
  ok(await p.locator('.doc-rich table').count() === 1 && await p.locator('button[aria-label="Add row below"]').count() === 1, 'a table can be inserted and gets its row and column tools');
  await p.keyboard.type('Step'); await p.keyboard.press('Tab'); await p.keyboard.type('Time'); await p.keyboard.press('Tab'); await p.keyboard.type('Cost');
  await p.click('button[aria-label="Add row below"]');
  ok(await p.locator('.doc-rich tr').count() === 4, 'rows can be added');
  await p.locator('label:has-text("Status") select').selectOption('sent').catch(() => {});
  await p.click('button:has-text("Save")'); await p.waitForURL('**/billing/quotations/**', { timeout: 20000 });
  await p.waitForSelector('.doc-rich h2');
  const html = await p.locator('.doc-rich').first().innerHTML();
  ok(/<h2[^>]*>প্রস্তাবনা/.test(html) && /<strong>Fast shop<\/strong>/.test(html) && /<li>/.test(html) && /<table/.test(html), 'the saved proposal shows the heading, bold text, list and table');

  // editing an existing quote shows the proposal and the item details again (nothing is lost)
  const quoteId = p.url().split('/').pop();
  await p.goto(`${URL}/billing/quotation/${quoteId}/edit`); await p.waitForSelector('.doc-rich');
  await p.waitForFunction(() => document.querySelector('.doc-rich')?.textContent?.includes('Fast shop'), null, { timeout: 15000 });
  ok(true, 'the saved proposal text is back in the editor when editing');
  await p.waitForFunction(() => [...document.querySelectorAll('.doc-rich')].some((e) => e.textContent.includes('Home page and cart')), null, { timeout: 15000 });
  ok(true, 'the saved item details are back in their editor too');
  await p.goBack().catch(() => {});

  // the print page is on the letterhead, with the header and footer repeating
  const id = p.url().split('/').pop();
  await p.goto(`${URL}/print/quotation/${id}`); await p.waitForSelector('.letterhead-sheet');
  const sheet = await p.locator('.letterhead-sheet').innerText();
  ok(/\b\d{2}\/\d{2}\/\d{4}\b/.test(sheet), 'dates are written dd/mm/yyyy');
  ok(sheet.includes('Sherpur') && sheet.includes('@'), 'the letterhead carries the business address and contact');
  const css = await p.evaluate(() => { const t = document.querySelector('.lh-wrap'); return [getComputedStyle(t.querySelector('thead')).display, getComputedStyle(t.querySelector('tfoot')).display]; });
  ok(css[0] === 'table-header-group' && css[1] === 'table-footer-group', 'header and footer repeat on every printed page');
  await p.emulateMedia({ media: 'print' });
  await p.pdf({ path: process.env.E2E_TMP ? process.env.E2E_TMP + '/rich-quote.pdf' : '/tmp/rich-quote.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true });
  ok(true, 'the print page renders to a PDF');
  await b.close();
})().catch(e => { console.log('ERROR', e.message.split('\n').slice(0, 4).join(' | ')); process.exitCode = 1; });
