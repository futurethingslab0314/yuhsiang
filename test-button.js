const gpio = require('rpi-gpio');

console.log('正在測試 GPIO 23 按鈕 (使用 rpi-gpio)...');
console.log('請按下按鈕看看是否有反應...');
console.log('按 Ctrl+C 退出');

// 使用 BCM 編號模式 (GPIO 23)
gpio.setMode(gpio.MODE_BCM);

// 設定 GPIO 23 為輸入，並啟用上拉電阻 (PULL_UP)
// 這樣沒按時是高電位 (true)，按下接地變低電位 (false)
gpio.setup(23, gpio.DIR_IN, gpio.EDGE_BOTH, (err) => {
    if (err) {
        console.error('無法設定 GPIO:', err);
        return;
    }
    console.log('GPIO 23 設定完成，開始監聽...');
});

// 監聽變化事件
gpio.on('change', (channel, value) => {
    if (channel === 23) {
        console.log(`按鈕狀態改變: ${value} (${value ? '放開' : '按下'})`);
    }
});
