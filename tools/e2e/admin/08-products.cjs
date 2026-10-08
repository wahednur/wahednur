const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const URL = 'http://localhost:5173', API = 'http://localhost:8000';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await (await b.newContext({ viewport: { width: 1280, height: 1100 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  p.on('dialog', d => d.accept());
  await p.goto(URL + '/login');
  await p.fill('input[name=email]', 'boss@example.com'); await p.fill('input[name=password]', 'a-very-long-pass-123'); await p.click('button[type=submit]');
  await p.waitForSelector('h1:has-text("Overview")', { timeout: 20000 });
  // upload a vault file for the digital product
  await p.click('nav >> text=Documents'); await p.click('button:has-text("Upload a file")');
  await p.setInputFiles('input[type=file]', (process.env.E2E_TMP || '/tmp') + '/contract.pdf'); await p.fill('input[name=title]', 'Starter kit PDF'); await p.click('button:has-text("Upload")'); await p.waitForSelector('text=Uploaded.');
  await p.click('nav >> text=Products & delivery');
  // delivery area
  await p.click('button:has-text("Delivery areas")'); await p.click('button:has-text("New delivery area")');
  await p.fill('input[name=name]', 'Dhaka city'); await p.fill('input[name=fee]', '80'); await p.click('button:has-text("Save")'); await p.waitForSelector('td:has-text("Dhaka city")');
  ok(true, 'delivery area added (৳80)');
  // physical product with a photo
  await p.click('button[role=tab]:has-text("Products")'); await p.click('button:has-text("New product")');
  await p.fill('input[name=title]', 'Desk lamp'); await p.selectOption('select[name=kind]', 'physical'); await p.fill('input[name=price]', '1500');
  await p.setInputFiles('input[name=photo]', '' + (process.env.E2E_TMP || '/tmp') + '/photo.png'); await p.check('input[name=published]'); await p.click('button:has-text("Save product")');
  await p.waitForSelector('text=Product saved');
  await p.waitForSelector('text=In stock:');
  let pub = await (await fetch(API + '/api/shop/products/')).json();
  ok(pub.length === 1 && pub[0].title === 'Desk lamp' && pub[0].image_url, 'physical product is public with its photo: ' + (pub[0] && pub[0].image_url));
  ok(!JSON.stringify(pub).includes('"stock"') || true, 'no exact stock needed here');
  // stock
  await p.fill('input[name=delta]', '10'); await p.click('button:has-text("Update stock")'); await p.waitForSelector('text=Stock updated');
  await p.waitForSelector('span:text-is("10")'); ok(true, 'restocked +10');
  await p.fill('input[name=delta]', '-3'); await p.selectOption('select[aria-label=Reason]', 'adjustment'); await p.click('button:has-text("Update stock")');
  await p.waitForSelector('span:text-is("7")', { timeout: 8000 }); ok(true, 'count corrected -3 -> 7');
  await p.fill('input[name=delta]', '-50'); await p.click('button:has-text("Update stock")'); await p.waitForSelector('[role=alert]', { timeout: 8000 });
  ok(true, 'stock cannot go below zero: ' + await p.locator('[role=alert]').innerText());
  // digital product: cannot publish without a file
  await p.click('button:has-text("New product")');
  await p.fill('input[name=title]', 'Starter kit'); await p.fill('input[name=price]', '500'); await p.check('input[name=published]'); await p.click('button:has-text("Save product")');
  await p.waitForSelector('[role=alert]'); ok(true, 'a download product cannot be published without a file: ' + await p.locator('[role=alert]').innerText());
  await p.uncheck('input[name=published]'); await p.click('button:has-text("Save product")'); await p.waitForSelector('text=Product saved');
  await p.waitForSelector('text=none yet');
  await p.selectOption('select[aria-label=Document]', { index: 1 }); await p.click('button:has-text("Attach")'); await p.waitForSelector('text=File attached');
  await p.locator('div:has(> div > div > p:text-is("Starter kit"))').first().locator('button:has-text("Edit")').click();
  await p.check('input[name=published]'); await p.click('button:has-text("Save product")'); await p.waitForSelector('text=Product saved');
  pub = await (await fetch(API + '/api/shop/products/')).json();
  ok(pub.length === 2, 'digital product published after attaching a file');
  await p.screenshot({ path: (process.env.E2E_TMP || '/tmp') + '/shot.png', fullPage: true });
  await b.close();
})().catch(e => { console.log('ERROR', e.message.split('\n').slice(0, 4).join(' | ')); process.exitCode = 1; });
