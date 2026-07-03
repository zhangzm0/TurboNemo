// Test: generate random sequence → then sort it
import puppeteer from 'puppeteer-core';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const WORK_ID = '269526915';
const LIST_VAR = '71f0cb2c-b5b3-452a-a087-71e50c729b34';

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

async function clickMenu(page, label) {
  const result = await page.evaluate(l => {
    const btns = document.querySelectorAll('.ask-choice-container > div');
    for (const b of btns) {
      if (b.textContent.trim() === l) {
        const r = b.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return {x: r.x+r.width/2, y: r.y+r.height/2, found: true};
      }
    }
    return {found: false};
  }, label);
  if (result.found) {
    await page.mouse.click(result.x, result.y);
    return true;
  }
  return false;
}

async function waitForMenu(page, timeout=5000) {
  for (let i = 0; i < timeout/200; i++) {
    const has = await page.evaluate(() => document.querySelectorAll('.ask-choice-container > div').length > 0);
    if (has) return true;
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

async function waitForNoDialog(page, timeout=5000) {
  for (let i = 0; i < timeout/200; i++) {
    const hasInput = await page.evaluate(() => document.querySelectorAll('input[type="text"], input:not([type="hidden"])').length > 0);
    const hasMenu = await page.evaluate(() => document.querySelectorAll('.ask-choice-container > div').length > 0);
    if (!hasInput && !hasMenu) return true;
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

async function fillInput(page, val) {
  const inp = await page.$('input');
  if (!inp) return false;
  const box = await inp.boundingBox();
  await page.mouse.click(box.x+box.width/2, box.y+box.height/2);
  await new Promise(r => setTimeout(r, 100));
  await inp.type(String(val), {delay: 30});
  await new Promise(r => setTimeout(r, 100));
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 500));
  return true;
}

async function getList(page) {
  return page.evaluate(v => {
    const a = window.core?.actorManager?.list?.[0];
    const arr = a?._vars?.[v]?.value;
    return arr ? [...arr] : [];
  }, LIST_VAR);
}

async function getCanvasCenter(page) {
  return page.evaluate(() => {
    const cv = document.querySelector('canvas');
    const r = cv.getBoundingClientRect();
    return {x: r.x+r.width/2, y: r.y+r.height/2};
  });
}

async function clickActor(page) {
  const c = await getCanvasCenter(page);
  await page.mouse.click(c.x, c.y);
}

async function dismissDialog(page) {
  const c = await getCanvasCenter(page);
  await page.mouse.click(c.x + 200, c.y + 350);
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu'],
  });

  let errors = [], exitCode = 0;
  try {
    const page = await browser.newPage();
    page.setViewport({width:800, height:1000});
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(`http://localhost:${port}/?id=${WORK_ID}`, {waitUntil:'domcontentloaded', timeout:30000});
    try { await page.waitForFunction(() => { const e=document.getElementById('loading'); return !e||e.style.opacity==='0'||e.style.display==='none'; }, {timeout:60000}); } catch(_) {}
    await new Promise(r => setTimeout(r, 1000));

    // === STEP 1: CLICK → generate random sequence ===
    console.log('=== Step 1: 生成随机数列 ===');
    await clickActor(page);
    await new Promise(r => setTimeout(r, 1000));

    if (!await clickMenu(page, '数列相关')) { console.log('❌ Menu missing'); exitCode=1; }
    await waitForMenu(page);
    await new Promise(r => setTimeout(r, 300));

    if (!await clickMenu(page, '生成随机数列')) { console.log('❌ Sub-menu missing'); exitCode=1; }
    await new Promise(r => setTimeout(r, 1000));

    for (const val of [1, 30, 6, 1]) {
      if (await page.$('input')) {
        console.log(`  Input: ${val}`);
        await fillInput(page, val);
      }
    }
    await new Promise(r => setTimeout(r, 2000));

    let listA = await getList(page);
    console.log(`  List 'a' after gen: ${JSON.stringify(listA)} (len=${listA.length})`);
    if (listA.length === 0) { console.log('❌ Empty!'); exitCode=1; await browser.close(); server.close(); process.exit(exitCode); }

    // Dismiss result dialog
    await dismissDialog(page);
    await new Promise(r => setTimeout(r, 1000));
    // Wait until all dialogs/menus are gone
    await waitForNoDialog(page, 3000);
    console.log('  Dialog dismissed');

    // === STEP 2: SORT ===
    console.log('\n=== Step 2: 排序（正序） ===');

    // Debug: check actor position
    const actorInfo = await page.evaluate(() => {
      const am = window.core?.actorManager;
      const actor = am?.list?.[0];
      if (!actor?.sprite) return { found: false };
      const s = actor.sprite;
      return {
        found: true,
        x: s.x, y: s.y,
        visible: s.visible,
        worldVisible: s.worldVisible,
        width: s.width,
        height: s.height,
        scale: { x: s.scale.x, y: s.scale.y },
        canvasCenter: (() => {
          const cv = document.querySelector('canvas');
          if (!cv) return null;
          const r = cv.getBoundingClientRect();
          return { x: r.x + r.width/2, y: r.y + r.height/2 };
        })(),
      };
    });
    console.log(`  Actor info: ${JSON.stringify(actorInfo)}`);

    // Try clicking actor up to 3 times to trigger main menu
    let menuShowing = false;
    for (let attempt = 0; attempt < 3 && !menuShowing; attempt++) {
      console.log(`  Clicking actor (attempt ${attempt + 1})...`);
      await clickActor(page);
      await new Promise(r => setTimeout(r, 3000));
      menuShowing = await waitForMenu(page, 5000);
    }

    if (!menuShowing) {
      console.log('❌ Menu not showing in step 2');
      // Debug: dump page state
      const state = await page.evaluate(() => {
        const body = document.body.innerHTML.substring(0, 2000);
        const inputs = document.querySelectorAll('input').length;
        const menus = document.querySelectorAll('.ask-choice-container > div').length;
        const canvasBtn = document.querySelector('canvas')?.getBoundingClientRect();
        return { inputs, menus, canvasBtn: canvasBtn ? {x:canvasBtn.x,y:canvasBtn.y,w:canvasBtn.width,h:canvasBtn.height} : null, html: body };
      });
      console.log(`  Debug: inputs=${state.inputs} menus=${state.menus} canvas=${JSON.stringify(state.canvasBtn)}`);
      exitCode = 1;
    }
    await new Promise(r => setTimeout(r, 500));

    if (!await clickMenu(page, '排序（正序）')) { console.log('❌ Sort option missing'); exitCode=1; }
    await new Promise(r => setTimeout(r, 2000));

    listA = await getList(page);
    console.log(`  List 'a' after sort: ${JSON.stringify(listA)} (len=${listA.length})`);

    if (listA.length > 0) {
      const sorted = [...listA].sort((a,b) => a-b);
      const ok = JSON.stringify(listA) === JSON.stringify(sorted);
      console.log(`  ${ok ? '✅' : '❌'} Correctly sorted: ${ok}`);
      if (!ok) console.log(`  Expected: ${JSON.stringify(sorted)}`);
    } else {
      console.log('  ❌ List EMPTY — same-array bug still present');
      exitCode = 1;
    }

    console.log(`\n=== Summary ===`);
    console.log(`Errors: ${errors.length}`);
    if (errors.length > 0) errors.forEach(e => console.log(`  ❌ ${e}`));
    else console.log('✅ All OK');
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
