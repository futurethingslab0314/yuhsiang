# 📝 每日日記獎勵系統

> 一個基於 Raspberry Pi 的互動式日記應用，結合 AI 分析、遊戲化獎勵機制與實體列印回饋。

![版本](https://img.shields.io/badge/version-1.0.0-blue)
![授權](https://img.shields.io/badge/license-MIT-green)
![平台](https://img.shields.io/badge/platform-Raspberry%20Pi%20%7C%20Desktop-orange)

---

## ✨ 專案特色

### 🎯 核心功能

- **✍️ 雙模式輸入**: 支援文字打字和語音錄音
- **🤖 AI 情緒分析**: ChatGPT API 智能分析日記內容
- **🪙 短期回饋**: 硬幣掉落動畫 + 音效 + 即時獎勵
- **📊 長期激勵**: 進度追蹤 + 目標達成 + 紙籤列印
- **🎮 互動體驗**: 紅外線感應器模擬投幣（可選）
- **🖨️ 實體回饋**: Raspberry Pi 熱感印紙機整合

### 💡 設計理念

透過結合短期即時回饋（硬幣動畫）與長期目標追求（紙籤獎勵），建立持續寫日記的習慣，同時利用 AI 分析提供個性化的情緒回饋。

---

## 📦 檔案清單

```
yuhsiang/
├── diary-reward.html              # 主應用程式 (HTML)
├── diary-reward-style.css         # 樣式表
├── diary-reward-script.js         # JavaScript 邏輯
├── demo-showcase.html             # 功能展示頁面
├── 日記獎勵系統說明.md            # 詳細使用說明
├── 日記獎勵系統-README.md         # 本文件
├── 啟動日記系統.sh               # Linux/Mac 啟動腳本
├── 啟動日記系統.bat              # Windows 啟動腳本
└── sounds/                        # 音效資料夾
    └── README.md                  # 音效設定說明
```

---

## 🚀 快速開始

### 方法 1: 一鍵啟動（推薦）

#### Windows
```batch
雙擊執行: 啟動日記系統.bat
```

#### macOS / Linux / Raspberry Pi
```bash
bash 啟動日記系統.sh
```

### 方法 2: 手動啟動

```bash
# 1. 開啟終端機，切換到專案目錄
cd /path/to/yuhsiang

# 2. 啟動本地伺服器
python -m http.server 8000

# 3. 在瀏覽器開啟
# http://localhost:8000/diary-reward.html
```

### 方法 3: 查看功能展示

```
開啟: demo-showcase.html
```

---

## 📖 使用流程

### 1️⃣ 撰寫日記

**文字模式**:
- 點擊「📝 文字輸入」按鈕
- 在文字框輸入日記（至少 20 字）
- 點擊「✨ 提交日記」

**語音模式**:
- 點擊「🎤 語音輸入」按鈕
- 點擊麥克風圖示開始錄音
- 說出日記內容
- 再次點擊停止錄音
- 點擊「✨ 提交日記」

### 2️⃣ 獲得獎勵

- AI 分析情緒（2 秒模擬）
- 獲得 5-30 枚硬幣
- 觀看硬幣掉落動畫 🪙
- 聽到投幣音效 🔊

### 3️⃣ 追蹤進度

- 查看累積硬幣數量
- 觀察進度條變化
- 目標: 累積 100 枚硬幣

### 4️⃣ 達成目標

- 累積滿 100 枚硬幣
- 解鎖「紙籤準備列印」卡片
- 查看 AI 生成的任務內容
- 點擊列印（需硬體支援）

---

## 🔧 API 整合

系統提供 **完整的假資料測試**，可直接使用體驗所有功能。  
如需真實 API 整合，請參考以下說明：

### API 替換位置

| 位置 | 檔案 | 函式 | 用途 | 說明文件 |
|------|------|------|------|----------|
| ⚠️ 1 | `diary-reward-script.js` | `analyzeDiaryWithAI()` | ChatGPT 情緒分析 | [詳見說明](#api-1-chatgpt-情緒分析) |
| ⚠️ 2 | `diary-reward-script.js` | `playCoinSound()` | 硬幣音效播放 | [詳見說明](#api-2-硬幣音效) |
| ⚠️ 3 | `diary-reward-script.js` | `generateTicketContent()` | AI 生成紙籤內容 | [詳見說明](#api-3-ai-生成紙籤) |
| ⚠️ 4 | `diary-reward-script.js` | `confirmPrint()` | 印紙機控制 | [詳見說明](#api-4-印紙機控制) |

### API 1: ChatGPT 情緒分析

**位置**: `diary-reward-script.js` 第 200-250 行

**替換步驟**:
1. 註冊 OpenAI: https://platform.openai.com/
2. 創建 API Key
3. 替換代碼中的 `YOUR_OPENAI_API_KEY`

**詳細說明**: 請查看 `日記獎勵系統說明.md` 的 API 替換位置 1

### API 2: 硬幣音效

**位置**: `diary-reward-script.js` 第 350-380 行

**替換步驟**:
1. 下載音效檔案 (coin-drop.mp3)
2. 放置於 `sounds/` 資料夾
3. 取消代碼註解

**免費音效資源**: 詳見 `sounds/README.md`

### API 3: AI 生成紙籤

**位置**: `diary-reward-script.js` 第 400-430 行

**替換步驟**:
1. 使用與 API 1 相同的 OpenAI Key
2. 修改函式為 `async`
3. 調整 prompt 以生成個性化內容

**詳細說明**: 請查看 `日記獎勵系統說明.md` 的 API 替換位置 3

### API 4: 印紙機控制

**位置**: `diary-reward-script.js` 第 460-500 行

**替換步驟**:
1. 連接 Raspberry Pi 熱感印紙機
2. 安裝 Python `escpos` 套件
3. 建立 Flask API 或直接控制

**詳細說明**: 請查看 `日記獎勵系統說明.md` 的 API 替換位置 4

---

## 🔬 測試功能

### 瀏覽器 Console 指令

開啟瀏覽器開發者工具 (F12)，在 Console 輸入：

```javascript
// 填充測試日記內容
testFillData()

// 觸發硬幣動畫（15 個硬幣）
testCoinAnimation()

// 直接達到列印門檻
testShowPrint()
```

### 模擬投幣按鈕

右下角有「💰 測試投幣」按鈕，點擊可觸發硬幣動畫。

---

## 🛠️ 技術棧

### 前端
- **HTML5**: 語義化結構
- **CSS3**: 動畫與響應式設計
- **Vanilla JavaScript**: 無框架依賴
- **Web Speech API**: 語音識別（可選）

### 後端（可選）
- **Python**: 印紙機控制與 API 服務
- **Flask**: RESTful API 框架
- **python-escpos**: 印紙機驅動

### 硬體（可選）
- **Raspberry Pi**: 主控板
- **熱感印紙機**: 紙籤列印
- **紅外線感應器**: 投幣檢測

---

## 📱 支援平台

| 平台 | 螢幕尺寸 | 狀態 |
|------|---------|------|
| 桌面電腦 | 1200px+ | ✅ 完整支援 |
| 平板 | 768-1200px | ✅ 完整支援 |
| 手機 | < 768px | ✅ 完整支援 |
| Raspberry Pi DSI | 800x480 | ✅ 專門優化 |

---

## 🎨 自訂設定

### 調整獎勵目標

```javascript
// diary-reward-script.js
const AppState = {
    targetReward: 100,  // 改為你想要的目標值
    // ...
};
```

### 修改顏色主題

```css
/* diary-reward-style.css */
:root {
    --primary-color: #4CAF50;      /* 主色調 */
    --secondary-color: #FF9800;    /* 次要色 */
    --accent-color: #FFD700;       /* 強調色 */
}
```

### 調整獎勵範圍

```javascript
// diary-reward-script.js
// analyzeDiaryWithAI() 函式中
const totalReward = Math.min(Math.max(baseReward + emotionBonus, 5), 30);
//                                                              ↑    ↑
//                                                            最小  最大
```

---

## 🐛 常見問題

### Q1: 語音識別不工作？
**A**: 
- 確認使用 Chrome 或 Edge 瀏覽器
- 允許麥克風權限
- 確認系統麥克風正常運作

### Q2: 硬幣動畫卡頓？
**A**: 
- 硬幣數量限制在 20 個以內
- 關閉其他佔用資源的程式
- 使用較新的瀏覽器

### Q3: 印紙機無回應？
**A**: 
- 執行 `lsusb` 檢查 USB 連接
- 確認 `vendor_id` 和 `product_id` 正確
- 檢查印紙機電源與紙張

### Q4: 如何重置獎勵？
**A**: 
```javascript
// 瀏覽器 Console 執行
localStorage.clear()
location.reload()
```

---

## 📚 完整文件

| 文件 | 描述 |
|------|------|
| [日記獎勵系統說明.md](日記獎勵系統說明.md) | 詳細使用說明與 API 整合指南 |
| [sounds/README.md](sounds/README.md) | 音效檔案設定與資源 |
| [demo-showcase.html](demo-showcase.html) | 功能展示頁面 |

---

## 🔒 安全性建議

### ⚠️ 不要將 API Key 提交到 Git

```bash
# 建立 .gitignore
echo "*.env" >> .gitignore
echo "config.js" >> .gitignore
```

### ✅ 使用後端代理

```javascript
// 前端不直接呼叫 OpenAI
fetch('/api/analyze', {
    method: 'POST',
    body: JSON.stringify({ content })
})

// 後端處理 API Key
// Python Flask 範例請見完整說明文件
```

---

## 🚀 Raspberry Pi 部署

### 1. 傳輸檔案

```bash
# 使用 SCP
scp -r diary-reward* pi@raspberrypi.local:~/

# 或使用 Git
git clone https://github.com/your-repo.git
```

### 2. 設定自動啟動

```bash
# 編輯 autostart
nano ~/.config/lxsession/LXDE-pi/autostart

# 加入
@chromium-browser --kiosk --app=file:///home/pi/diary-reward.html
```

### 3. 安裝依賴

```bash
# Python 套件
pip install python-escpos flask flask-cors

# GPIO 支援
pip install RPi.GPIO
```

---

## 📈 未來計劃

- [ ] 多使用者支援
- [ ] 資料雲端同步
- [ ] 日記歷史查看
- [ ] 情緒趨勢分析
- [ ] 更多動畫效果
- [ ] 社群分享功能

---

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

### 貢獻方式
1. Fork 本專案
2. 創建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

---

## 📄 授權

本專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 文件

---

## 📧 聯絡方式

如有問題或建議，歡迎：
- 提交 Issue
- 發送 Email: [你的信箱]
- 查看原專案: https://github.com/your-username/yuhsiang

---

## 🙏 致謝

- OpenAI ChatGPT API
- Freesound.org 音效資源
- python-escpos 印紙機驅動
- 所有貢獻者

---

<div align="center">

**📝 祝你每天都有好心情，記得寫日記！✨**

Made with ❤️ for Raspberry Pi

[⬆ 回到頂部](#-每日日記獎勵系統)

</div>

