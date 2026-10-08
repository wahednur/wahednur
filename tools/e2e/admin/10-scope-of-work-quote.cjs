const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const URL = 'http://localhost:5173';
// Needs the quote made by: manage.py load_quote content/quotes/emis.template.json --client client@example.com --apply
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const ctx = await b.newContext({ viewport: { width: 1300, height: 1400 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  p.on('dialog', d => d.accept());
  await p.goto(URL + '/login');
  await p.fill('input[name=email]', 'boss@example.com'); await p.fill('input[name=password]', 'a-very-long-pass-123'); await p.click('button[type=submit]');
  await p.waitForSelector('h1:has-text("Overview")', { timeout: 20000 });
  await p.click('nav >> text=Billing'); await p.click('button[role=tab]:has-text("Quotes")');
  await p.click('a:has-text("QUO-")'); await p.waitForSelector('text=SHEET 12', { timeout: 15000 });
  const t = await p.locator('article').innerText();
  ok(t.includes('SHEET 01') && t.includes('ডেটাবেস ডিজাইন ও নরমালাইজেশন') && t.includes('৭–১০ দিন'), 'the 12 sheets show with Bengali text and time');
  ok(t.includes('৳307,000.00') && t.includes('৳443,000.00'), 'total 3,07,000 and estimate up to 4,43,000');
  ok(t.includes('(not in the total)') && t.includes('Included'), 'the Dockerization sheet is shown but not counted');
  ok(t.includes('40%') && t.includes('৳122,800.00') && t.includes('৳92,100.00'), 'payment plan 40/30/30 with amounts');
  const tl = t.toLowerCase(); // the stamp is upper-cased by CSS
  ok(tl.includes('risks') && t.includes('সিকিউরিটি স্কিপ') && tl.includes('rev a') && t.includes('A Polytechnic Institute'), 'risks, revision and the client name');
  await p.screenshot({ path: (process.env.E2E_TMP || '/tmp') + '/scope_quote.png', fullPage: true });
  // print page
  const [pop] = await Promise.all([ctx.waitForEvent('page'), p.click('text=Print or save as PDF')]);
  await pop.waitForSelector('text=SHEET 01'); ok((await pop.locator('button:has-text("Print or save as PDF")').count()) === 1, 'print page opens with the print button');
  await pop.close();
  // edit: a sheet is editable
  await p.click('button:has-text("Edit")'); await p.waitForSelector('h1:has-text("Edit quote")');
  await p.waitForSelector('input[aria-label=Description] >> nth=11');
  ok((await p.locator('input[aria-label=Description]').count()) === 12, 'editing loads all 12 sheets');
  ok((await p.locator('input[aria-label="Milestone percent"]').count()) === 3 && (await p.locator('input[aria-label="Risk"]').count()) >= 4, 'milestones and risks load');
  await p.locator('input[aria-label=Revision], label:has-text("Revision") input').first().fill('Rev B');
  await p.click('button:has-text("Save changes")'); await p.waitForSelector('text=Rev B', { timeout: 15000 });
  ok(true, 'saved as Rev B');
  // deliver, accept, convert with the quote's own plan
  await p.selectOption('select[aria-label="Change status"]', 'send'); await p.waitForSelector('select[aria-label="Change status"] >> text=Accepted', { state: 'attached' });
  await p.selectOption('select[aria-label="Change status"]', 'accept'); await p.waitForSelector('button:has-text("Create invoice")');
  await p.click('button:has-text("Create invoice")');
  ok((await p.locator('input[aria-label=Label]').count()) === 3, 'the invoice plan starts from the quote milestones');
  await p.click('button:has-text("Create draft invoice")'); await p.waitForSelector('text=INV-', { timeout: 15000 });
  const inv = await p.locator('body').innerText();
  ok(inv.includes('৳122,800.00') && inv.includes('৳92,100.00') && inv.includes('৳307,000.00'), 'invoice: 122,800 + 92,100 + 92,100 = 307,000');
  await b.close();
})().catch(e => { console.log('ERROR', e.message.split('\n').slice(0, 5).join(' | ')); process.exitCode = 1; });
