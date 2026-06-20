// src/core/screen-manager.js
import { Screen } from './screen.js';
import { Background } from './background.js';
import { Transition } from './transition.js';

class ScreenManager {
    constructor(stage) {
        this.stage = stage;
        this.list = [];
        this._current = null;
        this._selfHooks = {};
        this._screenHooks = {};
        this._transitionType = 'none';
        this._transition = new Transition();
    }

    createScreen(name, bgTexture, w, h) {
        const container = new PIXI.Container();
        container.name = name;
        container.visible = false;
        
        const bg = new PIXI.TilingSprite(bgTexture, bgTexture.width, bgTexture.height);
        bg.name = 'bg';
        bg.anchor.set(0.5, 0.5);
        const scale = Math.max(w / bgTexture.width, h / bgTexture.height);
        // const scale = bgTexture.width > bgTexture.height ? w / bgTexture.width: h / bgTexture.height;
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
        for (const [hookName, factory] of Object.entries(this._selfHooks || {})) {
            background[hookName] = factory(background);
        }
        this.list.push(screen);
        this.stage.screensContainer.addChild(container);
        this.stage.screensHtmlContainer.appendChild(htmlDiv);
        return screen;
    }

    setTransitionType(type) { this._transitionType = type; }

    switchTo(index, onSwitched) {
        const screen = this.list[index - 1];
        if (!screen || screen === this._current) return;

        const from = this._current;
        const done = () => {
            if (from) { from.container.visible = false; from.htmlDiv.style.display = 'none'; }
            screen.htmlDiv.style.display = '';
            this._current = screen;
            if (onSwitched) onSwitched(from?.name, screen.name);
        };

        if (this._transitionType !== 'none' && from) {
            screen.container.visible = true;
            this._transition.run(
                this._transitionType,
                from.container,
                screen.container,
                this.width || 562,
                this.height || 900,
                done,
            );
            this._transitionType = 'none';
        } else {
            if (from) { from.container.visible = false; from.htmlDiv.style.display = 'none'; }
            screen.container.visible = true;
            screen.htmlDiv.style.display = '';
            this._current = screen;
            if (onSwitched) onSwitched(from?.name, screen.name);
        }
    }

    getCurrent() { return this._current; }
    getByName(name) { return this.list.find(s => s.name === name) || null; }
    getCurrentIndex() {
        return this.list.indexOf(this._current) + 1;
    }
}

export { ScreenManager };