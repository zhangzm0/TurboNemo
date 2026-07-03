const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/data/data/com.termux/files/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));

  await page.goto('http://localhost:8158/?id=185121645', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    const txt = document.body?.innerText || '';
    return !txt.includes('加载中') && !txt.includes('Loading');
  }, { timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));

  // Filter for 拖动 procedure
  for (const l of logs) {
    if (l.includes('拖动')) console.log(l.substring(0, 2000));
  }

  // Also show all proc definitions
  console.log('\n=== ALL procedure definitions ===');
  for (const l of logs) {
    if (l.includes('_procFns[')) console.log(l.substring(0, 300));
  }

  await browser.close();
})();
