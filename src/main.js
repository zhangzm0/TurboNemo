// src/main.js
import { NemoPlayer } from './core/nemo-player.js';

const params = new URLSearchParams(window.location.search);
const workId = params.get('id') || '272459552';

const loadingEl = document.getElementById('loading');
const loadingDetail = document.getElementById('loadingDetail');
const infoEl = document.getElementById('info');

function setLoading(title, detail) {
    if (detail) loadingDetail.textContent = detail;
}

setLoading('TurboNemo', '正在获取作品信息...');

// 获取作品信息
const infoPromise = fetch(`https://api.codemao.cn/creation-tools/v1/works/${workId}`)
    .then(r => r.json())
    .then(data => {
        document.title = `${data.work_name} - TurboNemo`;
        infoEl.textContent = `By ${data.user_info.nickname}`;
        setLoading(data.work_name, `by ${data.user_info.nickname}`);
        return data;
    })
    .catch(() => {
        setLoading('TurboNemo', '无法获取作品信息');
        return null;
    });

setLoading('TurboNemo', '正在初始化引擎...');

const core = new NemoPlayer({ container: 'body', width: 562, height: 900 });

// 内置扩展
core.use((await import('./extensions/screen/index.js')).default);
core.use((await import('./extensions/actor/index.js')).default);

// 并行加载所有扩展
const extList = [
    'motion', 'looks', 'operators', 'variables', 'sensing',
    'clone', 'sound', 'pen', 'procedures', 'broadcast',
];

setLoading('TurboNemo', '正在加载扩展...');

let extLoaded = 0;
const extModules = await Promise.all(
    extList.map(name =>
        import(`./extensions/${name}/index.js`)
            .then(mod => {
                extLoaded++;
                setLoading('TurboNemo', `正在加载扩展... (${extLoaded}/${extList.length})`);
                return { name, mod: mod.default };
            })
            .catch(e => {
                console.warn(`⚠️ ${name} 加载失败:`, e.message);
                return null;
            })
    )
);

extModules.forEach(item => {
    if (item) {
        core.use(item.mod);
        console.log(`✅ ${item.name}`);
    }
});

// FPS
const fpsEl = document.getElementById('fps');
const timerEl = document.getElementById('timer');
let elapsed = 0;

core.app.ticker.add(() => {
    fpsEl.textContent = `FPS: ${core.getFPS()}`;
    elapsed += core.app.ticker.deltaMS / 1000;
    timerEl.textContent = elapsed.toFixed(2) + 's';
});

// 监听加载进度
core.eventBus.on('loader:before', ({ total }) => {
    setLoading('TurboNemo', `正在下载资源... (0/${total})`);
});

core.eventBus.on('loader:asset', ({ loaded, total }) => {
    setLoading('TurboNemo', `正在下载资源... (${loaded}/${total})`);
});

// 加载作品
setLoading('TurboNemo', '正在编译脚本...');
await core.loadFromWorkId(parseInt(workId));

// 隐藏加载页
loadingEl.style.opacity = '0';
setTimeout(() => loadingEl.remove(), 300);

console.log('✅ 就绪');
window.core = core;