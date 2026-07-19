const http = require('http');
const fs = require('fs');
const path = require('path');

const FILE_PATH = '/tmp/TurboNemo_full.tar.gz';
const PORT = 8000;

const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>TurboNemo 下载</title></head>
<body style="font-family: sans-serif; padding: 40px;">
<h2>TurboNemo 项目打包下载</h2>
<p>文件: TurboNemo_full.tar.gz (含源码、.git、编译产物，排除 node_modules 和 .bcm)</p>
<p><a href="/download" style="font-size: 18px; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">点击下载</a></p>
</body>
</html>`);
        return;
    }
    if (req.url === '/download') {
        const stat = fs.statSync(FILE_PATH);
        res.writeHead(200, {
            'Content-Type': 'application/gzip',
            'Content-Length': stat.size,
            'Content-Disposition': 'attachment; filename="TurboNemo_full.tar.gz"',
        });
        fs.createReadStream(FILE_PATH).pipe(res);
        return;
    }
    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`下载服务器已启动: http://localhost:${PORT}`);
    console.log(`或使用 wget: wget -O TurboNemo_full.tar.gz http://localhost:${PORT}/download`);
});
