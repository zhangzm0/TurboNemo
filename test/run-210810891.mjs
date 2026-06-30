// Test: drawing app project 210810891
import puppeteer from 'puppeteer-core';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const WORK_ID = '210810891';

const MIME = { '.js':'application/javascript','.html':'text/html','.png':'image/png','.json':'application/json','.bcm':'application/json' };
const server = createServer((req, res) => {
  let p = req.url.split('?')[0], f = join(DIST, p==='/'?'index.html':p);
  if (!existsSync(f)) f = join(ROOT, p);
  if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)]||'application/octet-stream', 'Access-Control-Allow-Origin':'*' });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu'],
  });

  let errors = [], consoleMsgs = [], exitCode = 0;

  try {
    const page = await browser.newPage();
    page.setViewport({width:800, height:1000});
    page.on('pageerror', e => { errors.push(e.message); console.log(`  ❌ page error: ${e.message}`); });
    page.on('console', msg => {
      const text = msg.text();
      consoleMsgs.push(text);
      if (text.startsWith('[actor:') || text.includes('compiled') || text.includes('就绪') || text.includes('✅') || text.includes('⚠️')) {
        console.log(`  ${text}`);
      }
    });

    console.log(`=== Loading project ${WORK_ID} ===`);
    await page.goto(`http://localhost:${port}/?id=${WORK_ID}`, {waitUntil:'domcontentloaded', timeout:30000});

    // Wait for loading to finish (loading overlay hidden or removed)
    try {
      await page.waitForFunction(() => {
        const el = document.getElementById('loading');
        return !el || el.style.opacity === '0' || el.style.display === 'none' || el.parentNode === null;
      }, {timeout: 60000});
    } catch(_) {
      console.log('  ⚠️ Loading overlay did not disappear within timeout');
    }
    await new Promise(r => setTimeout(r, 2000));

    // Check if core is initialized
    const coreReady = await page.evaluate(() => {
      return !!(window.core && window.core.scheduler && window.core.actorManager);
    });
    console.log(`  Core ready: ${coreReady}`);

    if (!coreReady) {
      console.log('❌ Core failed to initialize');
      exitCode = 1;
      await browser.close();
      server.close();
      process.exit(exitCode);
    }

    // Check actor count
    const actorCount = await page.evaluate(() => window.core.actorManager.list.length);
    console.log(`  Actor count: ${actorCount}`);

    // Check for running tasks
    const taskCount = await page.evaluate(() => {
      const all = window.core.scheduler._all || {};
      const running = Object.values(all).filter(t => t.state === 'running').length;
      return { total: Object.keys(all).length, running };
    });
    console.log(`  Tasks: total=${taskCount.total}, running=${taskCount.running}`);

    if (taskCount.running === 0) {
      console.log('❌ No running tasks');
      exitCode = 1;
    }

    // === Step 1: Click on canvas to trigger interactions ===
    console.log('\n=== Step 1: 点击绘画 ===');

    // Get canvas center
    const canvasCenter = await page.evaluate(() => {
      const cv = document.querySelector('canvas');
      if (!cv) return null;
      const r = cv.getBoundingClientRect();
      return { x: r.x + r.width/2, y: r.y + r.height/2, w: r.width, h: r.height };
    });
    if (!canvasCenter) { console.log('❌ No canvas found'); exitCode = 1; }
    else {
      console.log(`  Canvas: ${canvasCenter.w}x${canvasCenter.h} at (${canvasCenter.x}, ${canvasCenter.y})`);

      // Click and drag to draw
      const startX = canvasCenter.x - 50;
      const startY = canvasCenter.y;
      const endX = canvasCenter.x + 50;
      const endY = canvasCenter.y;

      console.log('  Drawing from', startX, startY, 'to', endX, endY);
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        await page.mouse.move(startX + (endX - startX) * t, startY + (endY - startY) * t);
        await new Promise(r => setTimeout(r, 30));
      }
      await page.mouse.up();
      await new Promise(r => setTimeout(r, 500));
    }

    // === Step 2: Switch to scene 2 programmatically for testing ===
    console.log('\n=== Step 2: 切换到场景2 ===');
    const switched = await page.evaluate(() => {
      try {
        window.core.screenManager.switchTo(2);
        return true;
      } catch(e) {
        console.error('Switch failed:', e);
        return false;
      }
    });
    console.log(`  Scene switch initiated: ${switched}`);
    await new Promise(r => setTimeout(r, 1000));
    const currentScene = await page.evaluate(() => {
      return window.core.screenManager.getCurrent()?.name;
    });
    console.log(`  Current scene: ${currentScene}`);

    // === Step 3: Click color picker (圆点) on scene 2 ===
    console.log('\n=== Step 3: 点击颜色选择器 ===');
    const dotPos = await page.evaluate(() => {
      const dot = window.core.actorManager.getByName('圆点');
      if (!dot?.sprite) return null;
      const s = dot.sprite;
      const rect = document.querySelector('canvas').getBoundingClientRect();
      const scaleX = rect.width / window.core.width;
      const scaleY = rect.height / window.core.height;
      const screenX = rect.left + (s.x + window.core.width / 2) * scaleX;
      const screenY = rect.top + (-s.y + window.core.height / 2) * scaleY;
      return { x: screenX, y: screenY };
    });
    if (dotPos) {
      console.log(`  Clicking 圆点 at (${dotPos.x}, ${dotPos.y})`);
      await page.mouse.click(dotPos.x, dotPos.y);
      await new Promise(r => setTimeout(r, 1000));
    } else {
      console.log('  ⚠️ 圆点 not found');
    }

    // === Step 4: Switch back to scene 1 ===
    console.log('\n=== Step 4: 返回场景1 ===');
    const switchedBack = await page.evaluate(() => {
      try {
        window.core.screenManager.switchTo(1);
        return true;
      } catch(e) {
        return false;
      }
    });
    console.log(`  Scene switch initiated: ${switchedBack}`);
    await new Promise(r => setTimeout(r, 1000));
    const currentScene2 = await page.evaluate(() => {
      return window.core.screenManager.getCurrent()?.name;
    });
    console.log(`  Current scene: ${currentScene2}`);

    // === Step 5: Check for errors and console messages ===
    console.log('\n=== Summary ===');
    console.log(`Page errors: ${errors.length}`);
    const errorLines = consoleMsgs.filter(m => m.includes('Error') || m.includes('error') || m.includes('❌') || m.includes('⚠️'));
    if (errorLines.length > 0) {
      errorLines.forEach(m => console.log(`  ${m}`));
    }
    if (errors.length > 0) {
      console.log('❌ Page errors found');
      exitCode = 1;
    } else {
      console.log('✅ No page errors');
    }
    if (taskCount.running > 0) {
      console.log('✅ Tasks running correctly');
    }

  } catch(e) {
    console.error(`❌ ${e.message}`);
    exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(exitCode);
}

await run();
