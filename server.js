const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 手動載入 .env 檔案
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...values] = trimmed.split('=');
      process.env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
  console.log('✅ 已載入環境變數');
}

const PORT = 3000;

// 簡單路由
const routes = {
  '/api/generate-guide': require('./api/generate-guide/index.js'),
  '/api/generate-print': require('./api/generate-print/index.js'),
  '/api/save-diary': require('./api/save-diary/index.js'),
};

const server = http.createServer(async (req, res) => {
  // 設置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 處理 OPTIONS 請求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // API 路由
  if (routes[pathname]) {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const handler = routes[pathname];
        const mockReq = {
          method: req.method,
          body: body ? JSON.parse(body) : {},
          headers: req.headers
        };
        const mockRes = {
          statusCode: 200,
          headers: {},
          setHeader: (key, value) => { res.setHeader(key, value); },
          writeHead: (code, headers) => {
            res.writeHead(code, headers || {});
          },
          json: (data) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          },
          status: (code) => {
            mockRes.statusCode = code;
            return mockRes;
          },
          end: (data) => res.end(data),
          send: (data) => res.end(data)
        };
        await handler.default(mockReq, mockRes);
      } catch (error) {
        console.error('API 錯誤:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // 靜態檔案服務
  let filePath = path.join(__dirname, pathname === '/' ? 'diary-reward.html' : pathname);
  
  // 安全性檢查
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };

    res.setHeader('Content-Type', contentTypes[ext] || 'text/plain');
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 伺服器已啟動！`);
  console.log(`📍 網址: http://localhost:${PORT}/diary-reward.html`);
  console.log(`📡 API: http://localhost:${PORT}/api/...`);
  console.log(`\n按 Ctrl+C 停止伺服器\n`);
});

