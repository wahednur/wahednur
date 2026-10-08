const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
// Needs: SESSION (the client's wn_sid cookie value) and QUOTE (the id of a delivered quotation), website on :3000, API on :8000.
const WEB = 'http://localhost:3000';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctx.addCookies([{ name: 'wn_sid', value: process.env.SESSION, domain: 'localhost', path: '/' }]);
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  p.on('dialog', d => d.accept());
  await p.goto(`${WEB}/app/billing/quotations/${process.env.QUOTE}`, { timeout: 90000 });
  await p.waitForSelector('text=SHEET 12', { timeout: 90000 });
  const t = await p.locator('article').innerText();
  ok(t.includes('ডেটাবেস ডিজাইন ও নরমালাইজেশন') && t.includes('৳307,000.00') && t.includes('৳443,000.00'), 'the client sees all 12 sheets in Bengali with the total and the estimate');
  ok(t.includes('40%') && t.includes('৳122,800.00'), 'the client sees the payment plan');
  ok((await p.locator('button:has-text("Accept")').count()) === 1 && (await p.locator('button:has-text("Decline")').count()) === 1, 'Accept and Decline are there');
  ok((await p.locator('text=Send to client').count()) === 0, 'the client sees no staff buttons');
  await p.emulateMedia({ media: 'print' });
  ok(await p.locator('button:has-text("Print or save")').isHidden() && await p.locator('article').isVisible(), 'when printing, buttons and menus are hidden and only the document remains');
  await p.emulateMedia({ media: 'screen' });
  await p.screenshot({ path: (process.env.E2E_TMP || '/tmp') + '/client_quote.png' });
  await p.click('button:has-text("Accept")'); await p.waitForSelector('text=View invoice', { state: 'detached', timeout: 1 }).catch(() => {});
  await p.waitForFunction(() => document.body.innerText.toLowerCase().includes('accepted'), null, { timeout: 15000 });
  ok(true, 'the client accepts the quotation');
  await b.close();
})().catch(e => { console.log('ERROR', e.message.split('\n').slice(0, 4).join(' | ')); process.exitCode = 1; });
