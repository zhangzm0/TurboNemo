#!/bin/bash
set -e

TS_DIR="/workspace/.tailscale"
TS_BIN="$TS_DIR/bin/tailscale"
TS_STATE="$TS_DIR/state/tailscaled.state"

echo "============================================"
echo "  启动 Tailscale"
echo "============================================"

if [ ! -f "$TS_BIN" ]; then
    echo "[1/4] 下载 tailscale..."
    mkdir -p "$TS_DIR/bin"
    wget -q https://pkgs.tailscale.com/stable/tailscale_1.66.4_amd64.tgz -O /tmp/ts.tgz
    tar -xzf /tmp/ts.tgz -C /tmp/
    cp /tmp/tailscale_1.66.4_amd64/tailscale "$TS_DIR/bin/"
    cp /tmp/tailscale_1.66.4_amd64/tailscaled "$TS_DIR/bin/"
    chmod +x "$TS_DIR/bin/"*
    echo "    下载完成"
else
    echo "[1/4] Tailscale 已安装"
fi

if ! command -v tailscale &>/dev/null; then
    echo "[2/4] 创建软链接..."
    ln -sf "$TS_DIR/bin/tailscale" /usr/local/bin/tailscale
    ln -sf "$TS_DIR/bin/tailscaled" /usr/local/bin/tailscaled
    echo "    链接完成"
else
    echo "[2/4] 已在 PATH 中"
fi

echo "[3/4] 启动 tailscaled..."
mkdir -p "$TS_DIR/state"
if pgrep -x tailscaled > /dev/null; then
    echo "    tailscaled 已在运行"
else
    tailscaled --state="$TS_STATE" --socket="$TS_DIR/tailscaled.sock" --tun=userspace-networking &
    sleep 2
    echo "    启动完成"
fi

echo "[4/4] 连接..."
if [ -f "$TS_STATE" ]; then
    echo "    使用已有 state 恢复连接..."
    if ! tailscale status &>/dev/null; then
        tailscale up --accept-routes --authkey=""
    fi
else
    echo "    首次运行，请在浏览器中授权:"
    tailscale up --accept-routes
fi

echo ""
echo "============================================"
echo "  Tailscale IP: $(tailscale ip 2>/dev/null | head -1 || echo '未连接')"
echo "============================================"
