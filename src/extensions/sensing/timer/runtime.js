// ==================== sensing/timer/runtime.js ====================
const TIMER_BG =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANoAAACQCAMAAABZAIXjAAAC9FBMVEUAAAAAAACp9q6j8qOT6J6T6puX65uS65uQ7JuT8J2O7ZuP6pt98osAAACQ65yO6Zr8/PyR65yR652R65uP65n+/v4AAAD///+T55eT6ZqR6p2N6ZsAAAAAAAD///8AAAD///8/Pz/////29vaC8o/n5+fc3NzY2Nj///////+P6pL///+S6ZsAAADv7+////////////+3t7f///////9/8o3////4+PiB8o709PT////Ozs6E8JH///////+Pj4////9ycnL////////////BwcG/v7/GxsZtbW3////9vDb+2D7voBz+1j3vpx79ujX9uTX//v7/1z799Of77tv++fL//Pn658p/843+0Tz+1T3vpR39xDjvoxz/2T7+yTr9wDf9wTf8fwb8gQr+xzn9vjb9hxT+0zz+zzv+zjv+yzr+zTv+yDn+iRn8hA/+jB7+kSj+lCxt3Xr//vz/1j3+zDr+/Pn++/X658n9xjj+jyP9jiP98+P/lzH+ljH++PHz4F399+32fAn769XyqiP8//z98uD77dn+wzj9hBDveg7++O/98+XzfQ75fgj66dD99uv66M377dr55MTw4F7131r1rSfygRb4ghL84rv3tCn+xTj3/ffw+Or01lXxrTT5lzLypS/1uSr0iiL8ix3548H63rb52Kn41aL+0kP6/fjy+/Hq9eLw8N7m8dr77Nb+8NP+3qr/woh57If1zIb1yoT1yHt23nr9y3Dj4GLzu1r111X9vEH+mzz9uzr0lTH5vSzvpCTxpR/5iBv2hhrxsDv/8dv+6LD+35v+4Id36YSE3nz/00z9wEv7xDH+0YHtrD77kCj8iBn3+/Po6M/s5czm2bbF5LGx7rCe55qI8Ilz44D+3HmY3nP+tnGi33D+2G254Gza4WT9xWD/2FXzykzzx0nyvkPnqUDqlDP7uTL7tjLwkCzxmirwmif2jyf+znz9gQu787ue6XuP33X+0Wn+r2L/pUz9qTP9jSH9ph78kRFgS/v2AAAASXRSTlMAMwMFBw0KOjEfExb9LSYQ7kEuKRnxJM8/NiQdHBELB/c/39y3tqOWgXZVHhwYy8CxonZnTe3l5drVnY+JiGJbWE45KhaAgGsxIanT/AAAC5VJREFUeNrMkr0O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";

export function installTimer(core) {
    let startTime = 0;
    let elapsed = 0;
    let running = false;

    const timerApi = {
        start() {
            if (!running) {
                startTime = performance.now() - elapsed;
                running = true;
            }
        },
        stop() {
            if (running) {
                elapsed = performance.now() - startTime;
                running = false;
            }
        },
        reset() {
            startTime = performance.now();
            elapsed = 0;
        },
        getValue() {
            const val = running
                ? (performance.now() - startTime) / 1000
                : elapsed / 1000;
            return Number(val.toFixed(2));
        },
        show() {
            if (timerApi._el) timerApi._el.style.display = "";
        },
        hide() {
            if (timerApi._el) timerApi._el.style.display = "none";
        },
        _el: null,
    };

    core.globalHook("__timer__", () => timerApi);

    const timerSpec = core._bcm?.variable?.variable_dict?.timer;

    const el = document.createElement("div");
    el.style.cssText = `
        position:absolute;
        width:164px; height:108px;
        background:url(${TIMER_BG}) center/cover no-repeat;
        font-size:44px; font-family:'PingFangSC-Semibold','PingFang SC','Microsoft YaHei',sans-serif;
        font-weight:600; color:#43372E;
        display:flex; align-items:center; justify-content:center;
        padding-top:7px;
        pointer-events:none;
    `;
    el.style.left = (timerSpec?.position?.x ?? -281) + "px";
    el.style.top = -(timerSpec?.position?.y ?? 402) + "px";
    el.textContent = "00:00";

    if (!timerSpec?.visible) {
        el.style.display = "none";
    }

    core.stage.globalHtmlLayer.appendChild(el);
    timerApi._el = el;

    // sensing/timer/runtime.js - ticker 更新部分
    core.app.ticker.add(() => {
        const val = timerApi.getValue();
        const sec = Math.floor(val);
        const ms = Math.floor((val - sec) * 100);
        el.textContent = `${String(sec).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
    });
}
