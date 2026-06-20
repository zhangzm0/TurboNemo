// src/core/registry.js
class Registry {
    constructor() { this._blocks = {}; }
    register(id, def) { this._blocks[id] = def; }
    registerAll(blocks) { for (const [id, def] of Object.entries(blocks)) this._blocks[id] = def; }
    get(id) { return this._blocks[id] || null; }
}

export { Registry };