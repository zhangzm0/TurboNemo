// src/core/screen-manager.js
import { Screen } from './screen.js';
import { Background } from './background.js';

class ScreenManager {
    constructor(stage) {
        this.stage = stage;
        this.list = [];
        this._current = null;
        this._screenHooks = {};
    }

    createScreen(name, bgTexture, w, h) {
        const container = new PIXI.Container();
        container.name = name;
        container.visible = false;
        
        const bg = new PIXI.TilingSprite(bgTexture, bgTexture.width, bgTexture.height);
        bg.name = 'bg';
        bg.anchor.set(0.5, 0.5);
        const scale = w > h ? w / bgTexture.width: h / bgTexture.height;
        bg.scale.set(scale, scale);
        
        const background = new Background(bg, name);
        container.addChild(bg);
        
        const actorLayer = new PIXI.Container();
        actorLayer.name = 'actor';
        container.addChild(actorLayer);
        const htmlDiv = document.createElement('div');
        htmlDiv.style.display = 'none';
        const screen = new Screen(name, container, background, actorLayer, htmlDiv);
        for (const [hookName, factory] of Object.entries(this._screenHooks || {})) {
            screen[hookName] = factory(screen);
        }
        this.list.push(screen);
        this.stage.screensContainer.addChild(container);
        this.stage.screensHtmlContainer.appendChild(htmlDiv);
        return screen;
    }

    switchTo(index) {
        const screen = this.list[index - 1];
        if (!screen || screen === this._current) return;
        if (this._current) {
            this._current.container.visible = false;
            this._current.htmlDiv.style.display = 'none';
        }
        screen.container.visible = true;
        screen.htmlDiv.style.display = '';
        this._current = screen;
    }

    getCurrent() { return this._current; }
    getByName(name) { return this.list.find(s => s.name === name) || null; }
    addScreenLayer(name) {
        for (const screen of this.list) {
            const layer = new PIXI.Container();
            layer.name = name;
            screen.container.addChild(layer);
            screen.layers[name] = layer;
        }
    }
}

export { ScreenManager };