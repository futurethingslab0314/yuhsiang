# 像素日記獎勵系統

結合像素硬幣遊戲介面與日記獎勵規則的創新系統，透過寫日記獲得像素硬幣獎勵，達成目標後可列印專屬任務紙籤。

## 🎮 功能特色

### 🪙 像素硬幣系統
- **物理引擎**：硬幣受重力影響自然下落和堆疊
- **碰撞檢測**：基於網格的精確碰撞檢測，自然堆疊效果
- **視覺效果**：28x28 像素的金色硬幣，純黑背景突出視覺
- **音效系統**：硬幣掉落時的像素風格音效

### 📝 日記獎勵機制
- **文字輸入**：支援 500 字以內的日記輸入
- **語音輸入**：使用瀏覽器語音識別功能錄製日記
- **AI 分析**：模擬 AI 情緒分析，根據內容給予 5-30 枚硬幣獎勵
- **進度追蹤**：累積 100 枚硬幣可解鎖列印功能

### 🎯 獎勵規則
- **基礎獎勵**：根據日記字數計算（每 10 字 = 1 硬幣）
- **情緒加成**：正面詞彙每出現一次 +3 硬幣
- **字數限制**：至少 20 字才能提交
- **獎勵範圍**：5-30 枚硬幣之間

### 🎤 語音指示器
- **動畫效果**：三個白色像素點模擬語音波形
- **像素風格**：與硬幣相同的 28x28 像素設計
- **持續動畫**：背景持續播放的語音指示動畫

## 🚀 快速開始

### 本地運行
```bash
# 方法一：使用 Python
python -m http.server 8000

# 方法二：使用 Node.js serve
npx serve .

# 然後在瀏覽器中訪問 http://localhost:8000
```

### 使用流程
1. **開啟設定**：點擊右上角的 ⚙️ 按鈕
2. **選擇輸入模式**：文字輸入或語音輸入
3. **寫日記**：輸入至少 20 字的日記內容
4. **提交分析**：AI 分析內容並給予獎勵
5. **收集硬幣**：硬幣會從天而降並堆疊
6. **達成目標**：累積 100 枚硬幣可列印任務紙籤

## 🎮 遊戲控制

### 鍵盤快捷鍵
- `ESC`：關閉設定面板
- `Enter`：提交日記（在文字輸入模式下）

### 觸控手勢
- **點擊設定按鈕**：開啟/關閉設定面板
- **長按語音按鈕**：開始/停止錄音
- **點擊提交按鈕**：提交日記獲得獎勵

## 🔧 技術實現

### 核心技術
- **Canvas 2D**：硬幣動畫和物理引擎
- **Web Audio API**：音效生成
- **Speech Recognition API**：語音識別
- **Local Storage**：資料持久化
- **CSS Grid/Flexbox**：響應式佈局

### 物理引擎
```javascript
// 重力系統
coin.velocityY += GRAVITY;
coin.y += coin.velocityY;

// 碰撞檢測
const hasSupport = y >= GROUND_Y || isPositionOccupied(x, y + COIN_SIZE);
const isFree = !isPositionOccupied(x, y);

// 堆疊算法
const settlePos = findSettlePosition(coin.x, coin.y);
```

### 獎勵計算
```javascript
// 基礎獎勵
let baseReward = Math.floor(content.length / 10);

// 正面情緒加成
const positiveWords = ['開心', '快樂', '愉快', '滿足', '感恩'];
const positiveCount = positiveWords.filter(word => content.includes(word)).length;
const emotionBonus = positiveCount * 3;

// 總獎勵（5-30 範圍）
const totalReward = Math.min(Math.max(baseReward + emotionBonus, 5), 30);
```

## 📊 資料結構

### 應用程式狀態
```javascript
const AppState = {
    totalRewards: 0,      // 總硬幣數量
    todayReward: 0,       // 今日獲得硬幣
    targetReward: 100,    // 目標硬幣數量
    currentMode: 'text',  // 當前輸入模式
    diaryContent: '',     // 日記內容
    recognition: null     // 語音識別物件
};
```

### 硬幣物件
```javascript
const coin = {
    x: 100,              // X 座標
    y: -56,              // Y 座標
    velocityY: 0,        // Y 方向速度
    size: 28,            // 硬幣大小
    settled: false       // 是否已定居
};
```

## 🎨 自訂設定

### 調整獎勵目標
```javascript
// 在 pixel-diary-system.js 中修改
const AppState = {
    targetReward: 100,  // 改為你想要的目標值
    // ...
};
```

### 修改硬幣參數
```javascript
// 在 PixelCoinSystem 類別中調整
this.COIN_SIZE = 28;           // 硬幣大小
this.GRAVITY = 0.8;           // 重力強度
this.MAX_COINS = 200;         // 最大硬幣數量
this.SPAWN_INTERVAL = 120;    // 生成間隔
```

### 調整獎勵規則
```javascript
// 在 analyzeDiaryWithAI 函式中修改
let baseReward = Math.floor(content.length / 10);  // 基礎獎勵計算
const emotionBonus = positiveCount * 3;            // 情緒加成倍數
const totalReward = Math.min(Math.max(baseReward + emotionBonus, 5), 30);  // 獎勵範圍
```

## 🔌 API 整合

### ChatGPT 情緒分析（可選）
```javascript
async function analyzeDiaryWithAI(content) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YOUR_API_KEY'
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: '你是一個情緒分析助手。根據日記內容給予 5-30 分的獎勵。'
                },
                {
                    role: 'user',
                    content: content
                }
            ]
        })
    });
    
    const data = await response.json();
    return parseInt(data.choices[0].message.content);
}
```

### 列印機整合（可選）
```javascript
function showPrintPreview() {
    // 透過後端 API 控制印表機
    fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content: generateTicketContent(),
            timestamp: new Date().toISOString()
        })
    });
}
```

## 📱 響應式設計

系統已針對以下尺寸優化：
- ✅ 桌面瀏覽器 (1200px+)
- ✅ 平板 (768px - 1200px)
- ✅ 手機 (< 768px)
- ✅ Raspberry Pi DSI 螢幕 (800x480)

## 🐛 開發者工具

### 測試函式
在瀏覽器 Console 中可用：
```javascript
// 添加硬幣
testAddCoins(20)

// 填充測試資料
testFillData()

// 測試列印功能
testShowPrint()
```

### 除錯資訊
```javascript
// 查看當前狀態
console.log(AppState)

// 查看硬幣系統
console.log(pixelCoinSystem)

// 清除所有資料
localStorage.removeItem('pixelDiaryRewardState')
```

## 🔐 隱私與安全

### 資料儲存
- **本地儲存**：所有資料儲存在瀏覽器 localStorage
- **無伺服器**：預設不傳送資料到外部伺服器
- **可選 API**：可選擇性整合 ChatGPT 或列印 API

### 語音識別
- **本地處理**：使用瀏覽器內建語音識別
- **無記錄**：不儲存語音資料
- **即時轉換**：語音即時轉換為文字

## 🚀 部署建議

### 靜態部署
```bash
# 部署到 GitHub Pages
git push origin main

# 部署到 Netlify
netlify deploy --prod

# 部署到 Vercel
vercel --prod
```

### Raspberry Pi 部署
```bash
# 傳輸檔案到樹莓派
scp -r pixel-diary-reward pi@raspberrypi.local:~/

# 設定自動啟動
echo "@chromium-browser --kiosk --app=file:///home/pi/pixel-diary-reward/index.html" >> ~/.config/lxsession/LXDE-pi/autostart
```

## 📄 授權

MIT License - 可自由使用、修改和分發。

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

---

**祝你使用愉快！記得每天寫日記收集硬幣 🪙✨**
