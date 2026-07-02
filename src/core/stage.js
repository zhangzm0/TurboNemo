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

        // 外层裁剪容器：固定大小，overflow:hidden，不参与坐标变换
        this.clipContainer = document.createElement('div');
        this.clipContainer.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;';
        this.app.view.parentElement.appendChild(this.clipContainer);

        // HTML 内部容器：负责坐标系变换
        this.htmlContainer = document.createElement('div');
        this.htmlContainer.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
        this.clipContainer.appendChild(this.htmlContainer);

        this.screensHtmlContainer = document.createElement('div');
        this.htmlContainer.appendChild(this.screensHtmlContainer);

        this.globalHtmlLayer = document.createElement('div');
        this.globalHtmlLayer.style.cssText = 'position:absolute;top:0;left:0;';
        this.htmlContainer.appendChild(this.globalHtmlLayer);

        this._scale = 1;
        this._offsetX = 0;
        this._offsetY = 0;
        this._canvasRect = { width: 0, height: 0 };
    }

    resize(w, h) {
        this.app.renderer.resize(w, h);

        const scale = Math.min(window.innerWidth / w, window.innerHeight / h);
        const canvasW = w * scale;
        const canvasH = h * scale;
        const offsetX = (window.innerWidth - canvasW) / 2;
        const offsetY = (window.innerHeight - canvasH) / 2;

        this._scale = scale;
        this._offsetX = offsetX;
        this._offsetY = offsetY;
        this._canvasRect = { width: canvasW, height: canvasH };

        // Canvas 定位
        this.app.view.style.width = canvasW + 'px';
        this.app.view.style.height = canvasH + 'px';
        this.app.view.style.position = 'absolute';
        this.app.view.style.left = offsetX + 'px';
        this.app.view.style.top = offsetY + 'px';

        // PixiJS 舞台偏移
        this.app.stage.x = w / 2;
        this.app.stage.y = h / 2;

        // 外层裁剪容器：和 Canvas 相同位置大小，不 transform
        this.clipContainer.style.position = 'absolute';
        this.clipContainer.style.left = offsetX + 'px';
        this.clipContainer.style.top = offsetY + 'px';
        this.clipContainer.style.width = canvasW + 'px';
        this.clipContainer.style.height = canvasH + 'px';

        // 内部 HTML 容器：填满裁剪容器，用 transform 建立舞台坐标系
        this.htmlContainer.style.position = 'absolute';
        this.htmlContainer.style.left = '0px';
        this.htmlContainer.style.top = '0px';
        this.htmlContainer.style.width = canvasW + 'px';
        this.htmlContainer.style.height = canvasH + 'px';
        this.htmlContainer.style.transform = `translate(${canvasW / 2}px, ${canvasH / 2}px) scale(${scale})`;
        this.htmlContainer.style.transformOrigin = '0 0';

        // 子容器大小等于舞台设计尺寸
        this.screensHtmlContainer.style.position = 'absolute';
        this.screensHtmlContainer.style.left = '0';
        this.screensHtmlContainer.style.top = '0';
        this.screensHtmlContainer.style.width = w + 'px';
        this.screensHtmlContainer.style.height = h + 'px';

        this.globalHtmlLayer.style.position = 'absolute';
        this.globalHtmlLayer.style.left = '0';
        this.globalHtmlLayer.style.top = '0';
        this.globalHtmlLayer.style.width = w + 'px';
        this.globalHtmlLayer.style.height = h + 'px';
    }

}

export { Stage };