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
  await p.click('nav >> text=Content'); await p.click('button:has-text("New post")');
  await p.waitForSelector('h1:has-text("New post")');
  await p.fill('input[maxlength="200"]', 'My First Post!');
  ok((await p.locator('span:has-text("/blog/my-first-post")').count()) > 0, 'address made from the title: /blog/my-first-post');
  await p.fill('textarea >> nth=0', '> **In short:** tests work.\n\n## A table\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n<script>window.__x=1</script>\n\nHello world.');
  ok(await p.locator('table').count() === 1 && await p.locator('blockquote').count() === 1, 'preview renders the table and the In short box');
  ok(!(await p.evaluate(() => window.__x)), 'a script tag in the content does not run');
  await p.click('button:has-text("Publish")'); await p.waitForSelector('text=Published.');
  await p.waitForURL(/\/content\/\d+/);
  let list = await (await fetch(API + '/api/cms/pages/?kind=post')).json();
  ok(list.some(x => x.slug === 'my-first-post'), 'the post is on the public API');
  // slug stays when the title changes
  await p.fill('input[maxlength="200"]', 'My First Post, edited'); await p.click('button:has-text("Save")'); await p.waitForSelector('text=Saved.');
  list = await (await fetch(API + '/api/cms/pages/?kind=post')).json();
  ok(list.some(x => x.slug === 'my-first-post' && x.title.includes('edited')), 'editing the title keeps the address');
  // manual SEO
  await p.waitForSelector('text=Search engine text');
  await p.fill('input[maxlength="80"]', 'Hand written title'); await p.fill('textarea[maxlength="200"]', 'Hand written description.');
  await p.click('button:has-text("Use my text")'); await p.waitForSelector('text=saved and locked');
  list = await (await fetch(API + '/api/cms/pages/my-first-post/')).json();
  ok(list.seo_title === 'Hand written title', 'hand-written search text is saved');
  await p.click('button:has-text("Unpublish")'); await p.waitForSelector('text=Saved as a draft.');
  const r = await fetch(API + '/api/cms/pages/my-first-post/'); ok(r.status === 404, 'unpublished post is gone from the public API');
  await p.screenshot({ path: (process.env.E2E_TMP || '/tmp') + '/shot.png', fullPage: true });
  await p.click('button:has-text("Delete")'); await p.waitForURL(/\/content$/);
  ok(await p.locator('text=My First Post').count() === 0, 'post deleted');
  await b.close();
})().catch(e => { console.log('ERROR', e.message.split('\n').slice(0, 4).join(' | ')); process.exitCode = 1; });
