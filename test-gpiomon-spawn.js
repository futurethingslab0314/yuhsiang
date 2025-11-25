const { spawn } = require('child_process');

console.log('正在測試 Node.js 呼叫 gpiomon...');
console.log('請按下按鈕...');

// 嘗試呼叫 gpiomon
const gpiomon = spawn('gpiomon', ['gpiochip4', '18']);

gpiomon.stdout.on('data', (data) => {
    console.log(`收到數據: ${data.toString()}`);
});

gpiomon.stderr.on('data', (data) => {
    console.error(`錯誤輸出: ${data}`);
});

gpiomon.on('close', (code) => {
    console.log(`gpiomon 結束，代碼: ${code}`);
});

gpiomon.on('error', (err) => {
    console.error('無法啟動 gpiomon:', err);
});
