// 幽灵变量引用回归测试 — 作品 171952752
// puppeteer-core 加载真实构建产物 + 真实 BCM,跑完整链路
// 验证: 含 "?" 的 VAR/index 字段不再让作品崩(不再出现 "Unexpected token '?'")
import puppeteer from 'puppeteer-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CHROME = '/data/data/com.termux/files/usr/bin/chromium-browser';
const WORK_ID = '171952752';

// 简易静态服务器,把 dist 和 index.html 派出去
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = createServer((req, res) => {
    try {
        let p = decodeURIComponent(req.url.split('?')[0]);
        if (p === '/') p = '/index.html';
        const file = join(ROOT, 'dist', p);
        if (!existsSync(file)) { res.statusCode = 404; return res.end('nf'); }
        res.setHeader('Content-Type', MIME[file.match(/\.[^.]+$/)?.[0]] || 'application/octet-stream');
        res.end(readFileSync(file));
    } catch (e) { res.statusCode = 500; res.end(e.message); }
});

await new Promise(r => server.listen(0, r));
const port = server.address().port;
const url = `http://127.0.0.1:${port}/?id=${WORK_ID}&debug=1`;

const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();

const logs = [];
const errors = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => errors.push(e.message));

let exitCode = 0;
try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 等编译完成: 监听 "就绪" console 或 startOverlay 出现
    await page.waitForFunction(() => {
        const overlay = document.getElementById('startOverlay');
        return overlay && !overlay.classList.contains('hidden');
    }, { timeout: 45000 }).catch(() => {});

    // 点击开始,让脚本真正跑起来
    await page.click('#startOverlay').catch(() => {});
    await new Promise(r => setTimeout(r, 3000));

    // 验证 1: 没有 pageerror
    const realErrors = errors.filter(e => !e.includes('favicon'));
    if (realErrors.length) {
        console.log('FAIL: 出现 pageerror:');
        realErrors.forEach(e => console.log('  ', e));
        exitCode = 1;
    } else {
        console.log('OK  无 pageerror');
    }

    // 验证 2: console 里没有 "Unexpected token '?'"
    const syntaxErr = logs.filter(l => /Unexpected token|SyntaxError/.test(l));
    if (syntaxErr.length) {
        console.log('FAIL: 仍存在语法错误:');
        syntaxErr.forEach(l => console.log('  ', l));
        exitCode = 1;
    } else {
        console.log('OK  无语法错误');
    }

    // 验证 3: 幽灵变量告警出现(说明 fallback 生效)
    const ghostWarn = logs.filter(l => /非法变量 ID|非法造型索引|__ghost_var__/.test(l));
    console.log(`幽灵引用 fallback 告警数: ${ghostWarn.length}`);
    ghostWarn.slice(0, 5).forEach(l => console.log('  ', l));

    // 验证 4: FPS 有数字(说明 ticker 在跑,脚本没崩)
    const hasFps = logs.filter(l => /FPS:/.test(l));
    if (hasFps.length) {
        console.log('OK  ticker 正常运行(FPS 有输出)');
    }

} catch (e) {
    console.log('FAIL: 测试异常:', e.message);
    exitCode = 1;
} finally {
    await browser.close();
    server.close();
}

console.log(exitCode === 0 ? '\nALL OK' : '\nFAILED');
process.exit(exitCode);
