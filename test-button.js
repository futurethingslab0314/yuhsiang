const Gpio = require('onoff').Gpio;

console.log('正在測試 GPIO 18 按鈕...');
console.log('請按下按鈕看看是否有反應...');
console.log('按 Ctrl+C 退出');

try {
    // 設定 GPIO 18 為輸入，監聽 'both' (按下和放開)
    // 移除 debounceTimeout 以避免 EINVAL 錯誤
    const button = new Gpio(18, 'in', 'both');

    button.watch((err, value) => {
        if (err) {
            console.error('錯誤:', err);
            return;
        }
        console.log(`按鈕狀態改變: ${value} (${value === 0 ? '按下' : '放開'})`);
    });

} catch (e) {
    console.error('無法初始化 GPIO:', e.message);
    console.log('請確認您是在 Raspberry Pi 上執行，並且有 sudo 權限 (如果需要)');
}
