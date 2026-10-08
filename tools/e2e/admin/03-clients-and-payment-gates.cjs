const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const URL = 'http://localhost:5173';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto(URL + '/login');
  await p.fill('input[name=email]', 'boss@example.com'); await p.fill('input[name=password]', 'a-very-long-pass-123'); await p.click('button[type=submit]');
  await p.waitForSelector('h1:has-text("Overview")', { timeout: 20000 });
  await p.click('nav >> text=Clients'); await p.click('button:has-text("New client")');
  await p.fill('input[name=email]', 'buyer@example.com');
  await p.click('label:has-text("Foreign client")');
  await p.fill('input[name=full_name]', 'Ann Buyer'); await p.fill('input[name=company]', 'Acme Inc');
  await p.click('button:has-text("Create client and send invitation")');
  await p.waitForSelector('text=Client created', { timeout: 15000 });
  await p.waitForSelector('tr:has-text("Ann Buyer")');  // the list refreshes after the notice appears
  const t = await p.locator('body').innerText();
  ok(t.includes('Ann Buyer') && t.includes('USD'), 'foreign client created, shown with USD');
  await p.fill('input[type=search]', 'Ann'); ok(await p.locator('tr:has-text("buyer@example.com")').count() === 1, 'client search');
  await p.click('button:has-text("Send invitation")'); await p.waitForSelector('text=Invitation sent again');
  ok(true, 'invitation can be sent again');
  // duplicate refused
  await p.click('button:has-text("New client")'); await p.fill('input[name=email]', 'buyer@example.com'); await p.click('button:has-text("Create client and send invitation")');
  await p.waitForSelector('[role=alert]'); ok((await p.locator('[role=alert]').innerText()).includes('already exists'), 'duplicate email refused');
  // project for that client
  await p.click('nav >> text=Projects'); await p.click('button:has-text("New project")');
  await p.fill('input[name=title]', 'Foreign build'); await p.selectOption('select[name=client]', { index: 1 });
  ok((await p.locator('select[name=client]').innerText()).includes('USD'), 'client chooser shows the currency');
  await p.click('button:has-text("Create project")'); await p.waitForSelector('text=Foreign build');
  // invoice: currency is locked to the client's
  await p.click('nav >> text=Billing'); await p.click('button:has-text("New invoice")');
  await p.click('button[aria-haspopup=listbox]'); await p.click('[role=option]');
  await p.waitForSelector('text=this document is billed in USD');
  ok(true, 'invoice currency follows the client: USD');
  await p.selectOption('label:has-text("Project") select', { label: 'Foreign build' });
  ok((await p.locator('textarea').last().inputValue()).includes('40% advance'), 'standard payment terms pre-filled');
  await p.fill('input[maxlength="200"]', 'Build'); await p.fill('input[aria-label=Description]', 'Work'); await p.fill('input[aria-label="Unit price"]', '1000');
  ok((await p.locator('input[aria-label=Label]').count()) === 3, 'default plan has three installments');
  await p.click('button:has-text("Save as draft")'); await p.waitForSelector('text=INV-');
  const it = await p.locator('body').innerText();
  ok(it.includes('Advance (before work starts)') && it.includes('$400.00') && it.includes('$300.00'), 'plan: $400 advance, $300 midway, $300 final');
  await p.click('button:has-text("Issue")'); await p.waitForSelector('text=Record a payment');
  // gates
  await p.click('nav >> text=Projects'); await p.waitForSelector('tr:has-text("Foreign build")');
  await p.locator('tr:has-text("Foreign build") >> button:has-text("In progress")').click();
  await p.waitForSelector('[role=alert]'); ok((await p.locator('[role=alert]').innerText()).includes('advance'), 'work cannot start before the advance is paid');
  await p.click('nav >> text=Billing'); await p.click('a:has-text("INV-")'); await p.waitForSelector('text=Record a payment');
  await p.fill('input[name=amount]', '400'); await p.click('button:has-text("Record payment")'); await p.waitForSelector('text=Payment recorded');
  await p.click('nav >> text=Projects'); await p.locator('tr:has-text("Foreign build") >> button:has-text("In progress")').click();
  await p.waitForSelector('tr:has-text("Foreign build") >> text=active', { timeout: 10000 });
  ok(true, 'after the $400 advance, work can start');
  await p.locator('tr:has-text("Foreign build") >> button:has-text("Completed")').click();
  await p.waitForSelector('[role=alert]'); ok((await p.locator('[role=alert]').innerText()).includes('full payment'), 'final delivery refused until fully paid');
  await p.click('nav >> text=Billing'); await p.click('a:has-text("INV-")'); await p.waitForSelector('text=Record a payment');
  await p.fill('input[name=amount]', '600'); await p.click('button:has-text("Record payment")'); await p.waitForSelector('text=Payment recorded');
  await p.click('nav >> text=Projects'); await p.locator('tr:has-text("Foreign build") >> button:has-text("Completed")').click();
  await p.waitForSelector('tr:has-text("Foreign build") >> text=completed', { timeout: 10000 });
  ok(true, 'after full payment, the project can be completed');
  await p.screenshot({ path: (process.env.E2E_TMP || '/tmp') + '/shot.png' });
  await b.close();
})().catch(e => { console.log('ERROR', e.message.split('\n').slice(0, 4).join(' | ')); process.exitCode = 1; });
