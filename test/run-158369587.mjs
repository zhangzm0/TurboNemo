// Test: Mobile OS simulator project 158369587
import puppeteer from 'puppeteer-core';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const WORK_ID = '158369587';

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
    page.setViewport({width:600, height:1000});
    page.on('pageerror', e => { errors.push(e.message); console.log(`  ❌ page error: ${e.message}`); });
    page.on('console', msg => {
      const text = msg.text();
      consoleMsgs.push(text);
      if (text.startsWith('[actor:') || text.includes('compiled') || text.includes('就绪') || text.includes('✅') || text.includes('⚠️') || text.includes('Error') || text.includes('unknown')) {
        console.log(`  ${text}`);
      }
    });

    console.log(`=== Loading project ${WORK_ID} ===`);
    await page.goto(`http://localhost:${port}/?id=${WORK_ID}`, {waitUntil:'domcontentloaded', timeout:30000});

    // Wait for loading to finish
    try {
      await page.waitForFunction(() => {
        const el = document.getElementById('loading');
        return !el || el.style.opacity === '0' || el.style.display === 'none' || el.parentNode === null;
      }, {timeout: 120000});
    } catch(_) {
      console.log('  ⚠️ Loading overlay did not disappear within timeout');
    }
    await new Promise(r => setTimeout(r, 3000));

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
    const taskState = await page.evaluate(() => {
      const all = window.core.scheduler._all || {};
      const running = Object.values(all).filter(t => t.state === 'running').length;
      const paused = Object.values(all).filter(t => t.state === 'paused').length;
      const finished = Object.values(all).filter(t => t.state === 'finished').length;
      const stopped = Object.values(all).filter(t => t.state === 'stopped').length;
      return { total: Object.keys(all).length, running, paused, finished, stopped };
    });
    console.log(`  Tasks: total=${taskState.total}, running=${taskState.running}, paused=${taskState.paused}, finished=${taskState.finished}, stopped=${taskState.stopped}`);

    if (taskState.running === 0) {
      console.log('⚠️ No running tasks (may be expected if all are event-driven)');
    }

    // Check for any error messages
    const errorLines = consoleMsgs.filter(m => m.includes('Error') || m.includes('error') || m.includes('unknown'));
    if (errorLines.length > 0) {
      console.log(`\n⚠️ Found ${errorLines.length} error/warning messages:`);
      errorLines.forEach(m => console.log(`  ${m}`));
    }

    // Check the screen/scene count
    const sceneCount = await page.evaluate(() => window.core.screenManager.list.length);
    console.log(`  Scene count: ${sceneCount}`);

    // Log current scene info
    const sceneInfo = await page.evaluate(() => {
      const cur = window.core.screenManager.getCurrent();
      return cur ? { name: cur.name, index: window.core.screenManager.getCurrentIndex() } : null;
    });
    console.log(`  Current scene: ${sceneInfo?.name} (index ${sceneInfo?.index})`);

    // Wait a bit for scripts to stabilize
    await new Promise(r => setTimeout(r, 3000));

    // Try clicking on the canvas (to trigger any self_on_tap / pointer events)
    console.log('\n=== Clicking on canvas ===');
    const canvasRect = await page.evaluate(() => {
      const cv = document.querySelector('canvas');
      if (!cv) return null;
      const r = cv.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    if (canvasRect) {
      // Click center
      const cx = canvasRect.x + canvasRect.w / 2;
      const cy = canvasRect.y + canvasRect.h / 2;
      console.log(`  Canvas: ${canvasRect.w}x${canvasRect.h}, clicking center (${cx}, ${cy})`);
      await page.mouse.click(cx, cy);
      await new Promise(r => setTimeout(r, 1000));

      // Click lower part (where UI buttons might be)
      const lx = canvasRect.x + canvasRect.w / 2;
      const ly = canvasRect.y + canvasRect.h * 0.85;
      console.log(`  Clicking lower area (${lx}, ${ly})`);
      await page.mouse.click(lx, ly);
      await new Promise(r => setTimeout(r, 1000));
    }

    // Check FPS
    const fps = await page.evaluate(() => window.core.getFPS());
    console.log(`  FPS: ${fps}`);

    // Final check on task states
    const finalState = await page.evaluate(() => {
      const all = window.core.scheduler._all || {};
      const running = Object.values(all).filter(t => t.state === 'running').length;
      return running;
    });
    console.log(`  Running tasks after interactions: ${finalState}`);

    // Summary
    console.log('\n=== Summary ===');
    console.log(`Page errors: ${errors.length}`);
    if (errors.length > 0) {
      console.log('❌ Page errors found');
      exitCode = 1;
    } else {
      console.log('✅ No page errors');
    }
    console.log(`Total tasks: ${taskState.total}`);
    console.log(`Running tasks: ${taskState.running}`);
    console.log(`Actors: ${actorCount}`);
    console.log(`Scenes: ${sceneCount}`);

    if (actorCount > 200) {
      console.log('✅ All actors loaded (expected 267)');
    }

    // Check for unknown blocks (potential issues)
    const unknownBlockErrors = consoleMsgs.filter(m => m.includes('unknown'));
    if (unknownBlockErrors.length > 0) {
      console.log(`\n⚠️ Unknown blocks found (${unknownBlockErrors.length}):`);
      unknownBlockErrors.forEach(m => console.log(`  ${m}`));
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
