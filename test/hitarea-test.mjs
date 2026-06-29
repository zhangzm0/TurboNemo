// Puppeteer test for pixel-based hitArea
import puppeteer from 'puppeteer-core';
import { createServer } from 'http';
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');

// PIXI loaded from CDN in test page

// Serve dist files
const server = createServer((req, res) => {
    let filePath = join(DIST, req.url === '/' ? 'hitarea-test.html' : req.url);
    if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
    }
    const ext = filePath.split('.').pop();
    const mime = {
        'js': 'application/javascript', 'html': 'text/html',
        'css': 'text/css', 'png': 'image/png',
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(readFileSync(filePath));
});

await new Promise(r => server.listen(0, r));
const port = server.address().port;
console.log(`Test server on http://localhost:${port}`);

const testHTML = `<!DOCTYPE html>
<html><body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pixi.js/5.3.12/pixi.min.js"></script>
<script>
// ---- hitarea logic (self-contained for testing) ----
function buildPixelData(source) {
    const texW = source.naturalWidth || source.width;
    const texH = source.naturalHeight || source.height;
    if (!texW || !texH) return null;
    const sw = Math.ceil(texW * 0.7);
    const sh = Math.ceil(texH * 0.7);
    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(source, 0, 0, sw, sh);
    return new Uint32Array(ctx.getImageData(0, 0, sw, sh).data.buffer);
}
function makeHitArea(pixelData, sw, sh, texW, texH) {
    return {
        contains(x, y) {
            const px = Math.floor((x + texW / 2) * 0.7);
            const py = Math.floor((y + texH / 2) * 0.7);
            if (px < 0 || px >= sw || py < 0 || py >= sh) return false;
            return (pixelData[py * sw + px] >>> 24) > 0;
        }
    };
}

const results = [];

// ---- Test helper ----
function test(name, fn) {
    try { results.push({ name, pass: !!fn(), actual: null }); }
    catch(e) { results.push({ name, pass: false, actual: e.message }); }
}

// ---- Test 1: Known pixel grid via ImageData ----
function makeTestCanvas(w, h, setPixel) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    const id = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
            const [r, g, b, a] = setPixel(x, y);
            const i = (y * w + x) * 4;
            id.data[i] = r; id.data[i+1] = g;
            id.data[i+2] = b; id.data[i+3] = a;
        }
    ctx.putImageData(id, 0, 0);
    return c;
}

// Canvas 100x100, opaque block in [25,74]x[25,74], transparent outside
const c1 = makeTestCanvas(100, 100,
    (x, y) => (x >= 25 && x < 75 && y >= 25 && y < 75) ? [255, 0, 0, 255] : [0, 0, 0, 0]
);

const pd1 = buildPixelData(c1);  // Uint32Array, 70x70
const sw1 = 70, sh1 = 70, texW1 = 100, texH1 = 100;
const ha1 = makeHitArea(pd1, sw1, sh1, texW1, texH1);

// Center of sprite (local 0,0) → texture pixel (50,50) → inside block → hit
test('center point inside opaque area', () => ha1.contains(0, 0));

// Top-left corner of sprite (local -50,-50) → texture pixel (0,0) → outside → miss
test('top-left corner outside opaque area', () => !ha1.contains(-50, -50));

// Bottom-right corner (local 50,50) → texture pixel (100,100) → clipped to sw/sh → miss
test('bottom-right corner out of bounds', () => !ha1.contains(50, 50));

// Local (0, -26) → texture pixel (50, 24) → in transparent gap above block → miss
// scaled: 50*0.7=35, 24*0.7=16.8→16, pixel[16*70+35] should be transparent
test('point just above block is transparent', () => !ha1.contains(0, -26));

// Local (0, -24) → texture pixel (50, 26) → inside block → hit
test('point just inside top of block is opaque', () => ha1.contains(0, -24));

// Local (24, 0) → texture pixel (74, 50) → inside block → hit
test('point inside right side of block', () => ha1.contains(24, 0));

// Local (26, 0) → texture pixel (76, 50) → outside block → miss
test('point just right of block is transparent', () => !ha1.contains(26, 0));

// ---- Test 2: Texture with diagonal alpha gradiant (ensure 0.7x works) ----
const c2 = makeTestCanvas(50, 50,
    (x, y) => (x < 25) ? [0, 255, 0, 255] : [0, 0, 0, 0]
);
const pd2 = buildPixelData(c2);
const ha2 = makeHitArea(pd2, 35, 35, 50, 50);

// Local (-12, 0) → texture pixel (13, 25) → left half, opaque → hit
test('left half opaque', () => ha2.contains(-12, 0));

// Local (1, 0) → texture pixel (26, 25) → right half, transparent → miss
test('right half transparent', () => !ha2.contains(1, 0));

// ---- Test 3: Very small texture (1x1 opaque) ----
const c3 = makeTestCanvas(1, 1, () => [255, 255, 255, 255]);
const pd3 = buildPixelData(c3);
const ha3 = makeHitArea(pd3, 1, 1, 1, 1);

// Local (0, 0) → texture pixel (0.5, 0.5) → scaled (0.35, 0.35) → 0, 0 → hit
test('single pixel texture center hit', () => ha3.contains(0, 0));

// ---- Test 4: Fully transparent texture ----
const c4 = makeTestCanvas(10, 10, () => [0, 0, 0, 0]);
const pd4 = buildPixelData(c4);
const ha4 = makeHitArea(pd4, 7, 7, 10, 10);

test('fully transparent texture no hit', () => !ha4.contains(0, 0));

// ---- Test 5: PIXI integration ----
function testPIXI() {
    // Create PIXI texture from canvas
    const app = new PIXI.Application({ width: 100, height: 100, backgroundColor: 0x000000 });

    const c = document.createElement('canvas');
    c.width = 40; c.height = 40;
    const ctx = c.getContext('2d');
    // Draw a filled circle in the center
    ctx.fillStyle = 'blue';
    ctx.beginPath();
    ctx.arc(20, 20, 15, 0, Math.PI * 2);
    ctx.fill();

    const tex = PIXI.Texture.from(c);
    const texW2 = 40, texH2 = 40;
    const sw2 = Math.ceil(texW2 * 0.7), sh2 = Math.ceil(texH2 * 0.7);

    const source = tex.baseTexture.resource?.source;
    const pixelData2 = source ? buildPixelData(source) : null;
    const ha2 = pixelData2 ? makeHitArea(pixelData2, sw2, sh2, texW2, texH2) : null;

    test('PIXI: texture source available', () => !!source);
    test('PIXI: pixel data built', () => !!pixelData2);
    test('PIXI: hitArea created', () => !!ha2);

    if (ha2 && pixelData2) {
        // Check what alpha we get at center of scaled buffer
        const scaledCenterX = Math.floor((0 + texW2 / 2) * 0.7); // = 14
        const centerAlpha = pixelData2[14 * sw2 + 14] >>> 24;
        test('PIXI: center alpha > 0 (was ' + centerAlpha + ')', () => centerAlpha > 0);

        // Center sprite (0,0) → circle center → opaque → hit
        test('PIXI: center is opaque', () => ha2.contains(0, 0));
        // Top-left (-20,-20) → outside circle → transparent → miss
        test('PIXI: corner is transparent', () => !ha2.contains(-20, -20));
    }

    app.destroy(true, { children: true, texture: true });
}
testPIXI();

// ---- Report ----
window.__testResults = results;
document.title = 'HitArea Test';
</script>
</body></html>`;

writeFileSync(join(DIST, 'hitarea-test.html'), testHTML);

try {
    await runTest();
} finally {
    server.close();
}

async function runTest() {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
        const page = await browser.newPage();
        const pageErrors = [];
        page.on('pageerror', err => pageErrors.push(err.message));
        await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle0', timeout: 10000 });
        await new Promise(r => setTimeout(r, 1000));

        if (pageErrors.length) {
            console.log('PAGE ERRORS:', pageErrors.join('\n'));
        }

        const results = await page.evaluate(() => window.__testResults);
        if (!results || !Array.isArray(results)) {
            console.log('ERROR: window.__testResults =', results);
            const debug = await page.evaluate(() => ({ title: document.title }));
            console.log('Page:', debug);
            return;
        }

        console.log('\n=== HitArea Test Results ===');
        let pass = 0, fail = 0;
        for (const r of results) {
            const icon = r.pass ? '✓' : '✗';
            console.log(`  ${icon} ${r.name}`);
            if (r.pass) pass++; else fail++;
        }
        console.log(`\n${pass}/${pass + fail} passed` + (fail > 0 ? `, ${fail} FAILED` : ''));
    } finally {
        await browser.close();
    }
}
