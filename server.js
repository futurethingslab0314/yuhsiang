const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// 嘗試載入 onoff，如果在非 Linux 環境（如 Mac）則略過
let Gpio;
try {
  Gpio = require('onoff').Gpio;
} catch (e) {
  console.log('⚠️ onoff module not found or not supported. GPIO features disabled.');
}

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

// API 路由將動態載入
const routes = {};

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

  // API 路由 - 動態載入 ES6 模組
  if (pathname.startsWith('/api/')) {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        // 載入 CommonJS 模組
        let handler;
        if (pathname === '/api/generate-guide') {
          handler = require('./api/generate-guide/index.js');
        } else if (pathname === '/api/generate-print') {
          handler = require('./api/generate-print/index.js');
        } else if (pathname === '/api/save-diary') {
          handler = require('./api/save-diary/index.js');
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'API not found' }));
          return;
        }

        // 解析請求 body
        let requestBody = {};
        if (body) {
          try {
            requestBody = JSON.parse(body);
          } catch (e) {
            console.log('⚠️ Body 解析失敗，使用空物件');
          }
        }

        const mockReq = {
          method: req.method,
          body: requestBody,
          headers: req.headers
        };

        let responseSent = false;
        const mockRes = {
          statusCode: 200,
          headers: {},
          setHeader: (key, value) => {
            if (!responseSent) res.setHeader(key, value);
          },
          writeHead: (code, headers) => {
            if (!responseSent) {
              res.writeHead(code, headers || {});
              mockRes.statusCode = code;
              responseSent = true;
            }
          },
          json: (data) => {
            if (!responseSent) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
              responseSent = true;
            }
          },
          status: (code) => {
            mockRes.statusCode = code;
            return mockRes;
          },
          end: (data) => {
            if (!responseSent) {
              res.end(data);
              responseSent = true;
            }
          },
          send: (data) => {
            if (!responseSent) {
              res.end(data);
              responseSent = true;
            }
          }
        };

        await handler(mockReq, mockRes);

        // 如果 handler 沒有發送回應
        if (!responseSent) {
          res.writeHead(mockRes.statusCode || 200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'No response from handler' }));
        }

      } catch (error) {
        console.error('❌ API 錯誤:', error.message);
        console.error('❌ 完整錯誤:', error);
        if (!responseSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: error.message,
            stack: error.stack
          }));
        }
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

// ==========================================
// WebSocket Server Setup
// ==========================================
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('🔌 WebSocket Client Connected');

  ws.on('close', () => {
    console.log('🔌 WebSocket Client Disconnected');
  });
});

// 廣播訊息給所有連接的客戶端
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// ==========================================
// GPIO Button Setup (GPIO 18)
// ==========================================
if (Gpio) {
  try {
    // GPIO 18, Input, Both edges (falling/rising) for debounce handling
    // 使用 debounceTimeout 避免抖動
    const button = new Gpio(18, 'in', 'falling', { debounceTimeout: 20 });

    console.log('🔘 GPIO 18 Button Initialized');

    button.watch((err, value) => {
      if (err) {
        console.error('❌ GPIO Error:', err);
        return;
      }

      // value 0 = Pressed (Falling edge, assuming pull-up)
      // value 1 = Released
      if (value === 0) {
        console.log('🔘 Physical Button Pressed!');
        broadcast({ type: 'BUTTON_CLICK' });
      }
    });

    // 程式結束時釋放資源
    process.on('SIGINT', () => {
      button.unexport();
      process.exit();
    });

  } catch (error) {
    console.error('❌ Failed to initialize GPIO:', error.message);
  }
} else {
  console.log('⚠️ GPIO simulation mode: Use /api/simulate-button to trigger button click');
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 伺服器已啟動！`);
  console.log(`📍 網址: http://localhost:${PORT}/diary-reward.html`);
  console.log(`📡 API: http://localhost:${PORT}/api/...`);
  console.log(`\n按 Ctrl+C 停止伺服器\n`);
});

