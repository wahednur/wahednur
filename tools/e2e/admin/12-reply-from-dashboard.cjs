const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
// Needs one contact-form message (Karim) in the inbox. With no mail server configured the API only logs the
// message, which still counts as sent, so this checks the dashboard flow rather than real delivery.
const URL = 'http://localhost:5173';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto(URL + '/login');
  await p.fill('input[name=email]', 'boss@example.com'); await p.fill('input[name=password]', 'a-very-long-pass-123'); await p.click('button[type=submit]');
  await p.waitForSelector('h1:has-text("Overview")', { timeout: 20000 });
  await p.click('nav >> text=Messages'); await p.waitForSelector('text=Karim');
  await p.click('button[aria-expanded]'); await p.waitForSelector('button:has-text("Reply")');
  await p.click('button:has-text("Reply")');
  ok((await p.inputValue('input[maxlength="200"]')) === 'Re: Online store (eCommerce)', 'the subject is prefilled');
  ok((await p.inputValue('textarea')).startsWith('Hi Karim,'), 'the greeting uses the first name');
  await p.fill('textarea', 'Hi Karim,\n\nThanks, a shop is a good fit. Can we talk Sunday?\n\nWahed');
  await p.evaluate(() => [...document.querySelectorAll('button')].find(x => x.textContent === 'Send reply').click());
  await p.waitForSelector('text=Reply sent to karim@example.com.');
  ok(true, 'the dashboard confirms the reply was sent');
  await p.click('button[role=tab]:has-text("Replied")'); await p.waitForSelector('text=Karim');
  // the card stays open from before the tab change
  await p.waitForSelector('text=Your replies');
  ok((await p.locator('body').innerText()).includes('Can we talk Sunday?'), 'the sent reply is kept under the enquiry');
  await b.close();
})().catch(e => { console.log('ERROR', e.message.split('\n').slice(0, 4).join(' | ')); process.exitCode = 1; });
