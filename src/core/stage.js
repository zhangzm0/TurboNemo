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
        this.globalHtmlLayer.style.cssText = 'position:absolute;top:0;left:0;';
        this.htmlContainer.appendChild(this.globalHtmlLayer);
        
        // 存储当前缩放比例和偏移，供外部使用
        this._scale = 1;
        this._offsetX = 0;
        this._offsetY = 0;
        this._canvasRect = { width: 0, height: 0 };
    }

    resize(w, h) {
        this.app.renderer.resize(w, h);
        
        // 计算缩放和偏移
        const scale = Math.min(window.innerWidth / w, window.innerHeight / h);
        const canvasW = w * scale;
        const canvasH = h * scale;
        const offsetX = (window.innerWidth - canvasW) / 2;
        const offsetY = (window.innerHeight - canvasH) / 2;

        this._scale = scale;
        this._offsetX = offsetX;
        this._offsetY = offsetY;
        this._canvasRect = { width: canvasW, height: canvasH };

        // 设置 Canvas 样式
        this.app.view.style.width = canvasW + 'px';
        this.app.view.style.height = canvasH + 'px';
        this.app.view.style.position = 'absolute';
        this.app.view.style.left = offsetX + 'px';
        this.app.view.style.top = offsetY + 'px';

        // 设置 PIXI 舞台中心
        this.app.stage.x = w / 2;
        this.app.stage.y = h / 2;

        // HTML 容器：与 Canvas 相同的位置和大小
        this.htmlContainer.style.position = 'absolute';
        this.htmlContainer.style.left = offsetX + 'px';
        this.htmlContainer.style.top = offsetY + 'px';
        this.htmlContainer.style.width = canvasW + 'px';
        this.htmlContainer.style.height = canvasH + 'px';
        
        // 关键：使用 CSS transform 建立以中心为原点的坐标系，Y 轴向下
        // 这样 HTML 元素可以直接使用与 PIXI 相同的坐标！
        this.htmlContainer.style.transform = `translate(${canvasW/2}px, ${canvasH/2}px) scale(${scale})`;
        this.htmlContainer.style.transformOrigin = '0 0';
        
        // 子容器占满整个变换后的空间
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
    
    // 将 Nemo 坐标 (与 PIXI 相同) 转换为 HTML 元素应该设置的像素位置
    // 注意：由于父容器已经做了 transform，子元素只需要设置相对于变换后坐标系的位置
    // 但为了简化，我们直接返回在 globalHtmlLayer 中的坐标（已经是 Nemo 坐标系）
    nemoToLocal(x, y) {
        // 因为父容器已经做了 translate(cx, cy) + scale(scale)
        // 且子容器设置了宽高为 w/h，坐标系原点在中心，Y 轴向下
        // 所以直接返回 (x, y) 即可，子元素使用 transform: translate(xpx, ypx)
        return { x, y };
    }
    
    // 获取当前缩放，用于字体大小等
    getScale() {
        return this._scale;
    }
}

export { Stage };