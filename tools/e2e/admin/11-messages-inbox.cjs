const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
// Needs one contact-form message already sent to the API, with the mail server unreachable
// (start the API with EMAIL_HOST=127.0.0.1 EMAIL_PORT=1) so the "email not sent" path is shown.
const URL = 'http://localhost:5173';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto(URL + '/login');
  await p.fill('input[name=email]', 'boss@example.com'); await p.fill('input[name=password]', 'a-very-long-pass-123'); await p.click('button[type=submit]');
  await p.waitForSelector('h1:has-text("Overview")', { timeout: 20000 });
  ok((await p.locator('body').innerText()).includes('New messages from the contact form'), 'the overview counts the new message');
  await p.click('nav >> text=Messages'); await p.waitForSelector('text=Karim');
  ok((await p.locator('body').innerText()).includes('saved but the email to you did not go out'), 'a message whose email failed is flagged at the top');
  await p.click('button[aria-expanded]'); await p.waitForSelector('text=I want an online shop');
  ok((await p.locator('text=The email to you was not sent: SMTP send failed').count()) === 1, 'the reason from the mail server is shown');
  await p.click('button:has-text("Send the email again")'); await p.waitForSelector('text=still could not be sent');
  ok(true, 'sending again reports the failure instead of staying silent');
  await p.click('button[role=tab]:has-text("Read")'); await p.waitForSelector('text=Karim');
  ok(true, 'opening it moved it from New to Read');
  await p.click('button:has-text("Mark replied")');
  await p.click('button[role=tab]:has-text("Replied")'); await p.waitForSelector('text=Karim');
  ok(true, 'marked as replied');
  await b.close();
})().catch(e => { console.log('ERROR', e.message.split('\n').slice(0, 4).join(' | ')); process.exitCode = 1; });
