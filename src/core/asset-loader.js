// src/core/asset-loader.js
const API_BASE = 'https://api.codemao.cn/creation-tools/v1/works';
const CDN_BASE = 'https://creation.bcmcdn.com/490';
const STATIC_BASE = 'https://static.codemao.cn/nemo/22';

class AssetLoader {
    constructor(eventBus) {
        this._eventBus = eventBus;
        this._textures = {};
        this._audios = {};
        this._packs = {};
        this._packData = {};
        this.bcm = null;
        this.designW = 562;
        this.designH = 900;
    }

    getTexture(id) { return this._textures[id] || null; }

    // Register a resource pack (called by extensions before load)
    registerPack(name, resources) {
        this._packs[name] = resources;
    }

    // Get loaded pack data by pack name and resource id
    getPackData(name, id) {
        return this._packData[name]?.[id] ?? null;
    }

    // Get the entire pack data object (shared reference, populated async)
    getPack(name) {
        return this._packData[name] ?? null;
    }

    // Load all registered packs (called from nemo-player after extension init)
    async loadPacks() {
        const all = [];
        for (const [name, resources] of Object.entries(this._packs)) {
            if (this._packData[name]) continue; // 已加载
            this._packData[name] = {};
            for (const res of resources) {
                all.push(
                    fetch(res.url)
                        .then(r => r.arrayBuffer())
                        .then(buf => { this._packData[name][res.id] = buf; })
                        .catch(e => { console.warn(`pack ${name} ${res.id} failed:`, e.message); })
                );
            }
        }
        await Promise.all(all);
    }

    // 按名加载指定 pack（用于单个 pack 手动触发）
    async loadPack(name) {
        const resources = this._packs[name];
        if (!resources) return;
        if (this._packData[name]) return;
        this._packData[name] = {};
        await Promise.all(resources.map(res =>
            fetch(res.url)
                .then(r => r.arrayBuffer())
                .then(buf => { this._packData[name][res.id] = buf; })
                .catch(e => { console.warn(`pack ${name} ${res.id} failed:`, e.message); })
        ));
    }

    _resolveUrl(style) {
        if (style.url) return style.url.startsWith('http') ? style.url : `${CDN_BASE}/${style.url}`;
        if (style.texture) return `${STATIC_BASE}/${style.texture}`;
        return null;
    }

    _collectUrls(bcm) {
        const urls = [];
        for (const [id, style] of Object.entries(bcm?.styles?.styles_dict || {})) {
            const url = this._resolveUrl(style);
            if (url) urls.push({ id, url, type: 'image' });
        }
        for (const [id, audio] of Object.entries(bcm?.audios?.sounds || {})) {
            this._audios[id] = audio;
            if (audio.url?.startsWith('http')) urls.push({ id: `audio_${id}`, url: audio.url, type: 'audio' });
        }
        return urls;
    }

    async _loadAssets(urls) {
        const imageUrls = urls.filter(u => u.type === 'image');
        if (imageUrls.length === 0) return;
        const loader = new PIXI.Loader();
        let loaded = 0, total = imageUrls.length;
        this._eventBus.emit('loader:before', { total });
        for (const item of imageUrls) loader.add(item.id, item.url);
        return new Promise(resolve => {
            loader.onLoad.add(() => { loaded++; this._eventBus.emit('loader:asset', { loaded, total }); });
            loader.load((_, resources) => {
                for (const item of imageUrls) {
                    if (resources[item.id]?.texture) this._textures[item.id] = resources[item.id].texture;
                }
                resolve();
            });
        });
    }

    async loadFromWorkId(workId) {
        const resp = await fetch(`${API_BASE}/${workId}/source/public`);
        const data = await resp.json();
        const bcmUrl = data.work_urls?.[0];
        if (!bcmUrl) throw new Error('No BCM URL');
        return this.loadFromUrl(bcmUrl);
    }

    async loadFromUrl(url) {
        const resp = await fetch(url);
        return this.loadFromJSON(await resp.json());
    }

    async loadFromJSON(bcm) {
        this.bcm = bcm;
        this.designW = bcm.stage_size?.width || 562;
        this.designH = bcm.stage_size?.height || 900;
        const urls = this._collectUrls(bcm);
        await this._loadAssets(urls);
        this._eventBus.emit('loader:complete', { bcm });
        return bcm;
    }
}

export { AssetLoader };
