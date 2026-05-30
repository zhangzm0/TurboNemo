// src/core/stage.js
class Stage {
    constructor(app) {
        this.app = app;
        this.root = app.stage;
        this.screensContainer = new PIXI.Container();
        this.screensContainer.name = 'screens';
        this.root.addChild(this.screensContainer);
        this.globalPenLayer = new PIXI.Container();
        this.globalPenLayer.name = 'globalPen';
        this.root.addChild(this.globalPenLayer);
        this.globalUILayer = new PIXI.Container();
        this.globalUILayer.name = 'globalUI';
        this.root.addChild(this.globalUILayer);
        this.htmlContainer = document.createElement('div');
        this.htmlContainer.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
        this.app.view.parentElement.appendChild(this.htmlContainer);
        this.screensHtmlContainer = document.createElement('div');
        this.htmlContainer.appendChild(this.screensHtmlContainer);
        this.globalHtmlLayer = document.createElement('div');
        this.htmlContainer.appendChild(this.globalHtmlLayer);
    }

    addGlobalLayer(name) {
        const layer = new PIXI.Container();
        layer.name = name;
        this.root.addChild(layer);
        return layer;
    }

    addGlobalHtml(el) { this.globalHtmlLayer.appendChild(el); }

    resize(w, h) {
        this.app.renderer.resize(w, h);
        this.app.stage.x = w / 2;
        this.app.stage.y = h / 2;
        const scale = Math.min(window.innerWidth / w, window.innerHeight / h);
        this.app.view.style.width = w * scale + 'px';
        this.app.view.style.height = h * scale + 'px';
    }
}

export { Stage };