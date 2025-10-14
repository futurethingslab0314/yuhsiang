# 🚀 開始使用 - 每日日記獎勵系統

> 選擇您的使用場景，快速開始！

---

## 🎯 我該從哪裡開始？

<table>
<tr>
<td width="50%">

### 💻 **在電腦上使用**

**適合**: 桌面電腦、筆記型電腦

**步驟**:
1. 雙擊 `啟動日記系統.bat` (Windows)  
   或 `bash 啟動日記系統.sh` (Mac/Linux)
2. 瀏覽器會自動開啟
3. 開始寫日記！

**或直接開啟**:
- `diary-reward.html`

📖 **查看功能展示**:
- `demo-showcase.html`

</td>
<td width="50%">

### 🍓 **在 Raspberry Pi 上使用**

**適合**: Raspberry Pi 實體部署

**快速開始**:
1. 📄 查看 `快速開始-RaspberryPi.txt`
2. 傳輸檔案到 Pi
3. 設定自動啟動
4. 整合硬體（選配）

📖 **完整教學**:
- `Raspberry-Pi-部署指南.md`

</td>
</tr>
</table>

---

## 📂 重要檔案導覽

### 🌟 核心檔案（必須）
```
diary-reward.html          ← 主應用程式（從這裡開始）
diary-reward-style.css     ← 樣式表
diary-reward-script.js     ← JavaScript 邏輯
```

### 📚 說明文件
```
README-開始使用.md                 ← 本文件（你在這裡）
專案結構說明.txt                   ← 專案結構圖示
日記獎勵系統-README.md             ← 完整功能介紹
日記獎勵系統說明.md                ← API 整合教學
Raspberry-Pi-部署指南.md          ← Pi 部署完整教學
快速開始-RaspberryPi.txt          ← Pi 快速開始（5分鐘）
demo-showcase.html                ← 功能展示頁面
```

### 🚀 啟動腳本
```
啟動日記系統.bat              ← Windows 一鍵啟動
啟動日記系統.sh               ← macOS/Linux/Pi 啟動
```

### 🎵 音效資料夾
```
sounds/README.md              ← 音效設定說明
sounds/coin-drop.mp3          ← 硬幣音效（需自行下載）
```

---

## 🎯 使用情境指南

### 情境 1: 我想快速體驗功能

```bash
# Windows
雙擊: 啟動日記系統.bat

# macOS/Linux
bash 啟動日記系統.sh
```

✅ **立即可用** - 所有功能都有假資料測試

---

### 情境 2: 我想在 Raspberry Pi 上部署

#### 🏃 快速部署（5 分鐘）

**在你的電腦上**:
```bash
cd C:\Users\geniu\OneDrive\文件\GitHub\yuhsiang
scp diary-reward* pi@raspberrypi.local:~/
```

**在 Raspberry Pi 上**:
```bash
python3 -m http.server 8000
```

**開啟瀏覽器**:
```
http://localhost:8000/diary-reward.html
```

📖 **詳細步驟**: 查看 `快速開始-RaspberryPi.txt`

---

### 情境 3: 我想整合 ChatGPT API

1. 註冊 OpenAI 帳號: https://platform.openai.com/
2. 創建 API Key
3. 打開 `diary-reward-script.js`
4. 找到 `⚠️ API 替換位置 1` (約第 200 行)
5. 替換 `YOUR_OPENAI_API_KEY`

📖 **詳細教學**: 查看 `日記獎勵系統說明.md`

---

### 情境 4: 我想加入音效

1. 下載硬幣音效 (推薦: Freesound.org)
2. 重新命名為 `coin-drop.mp3`
3. 放入 `sounds/` 資料夾
4. 刷新頁面測試

📖 **音效資源**: 查看 `sounds/README.md`

---

### 情境 5: 我想連接印紙機

**硬體需求**:
- 熱感印紙機 (58mm/80mm)
- Raspberry Pi
- USB 連接線

**軟體設定**:
```bash
pip3 install python-escpos
python3 ~/print_ticket.py "測試列印"
```

📖 **完整教學**: 查看 `Raspberry-Pi-部署指南.md` 第 5.2 節

---

### 情境 6: 我想加入紅外線感應器

**硬體連接**:
```
紅外線感應器 → Raspberry Pi GPIO
VCC → 5V (Pin 2)
GND → GND (Pin 6)
OUT → GPIO 17 (Pin 11)
```

**軟體設定**:
```bash
pip3 install RPi.GPIO
python3 ~/ir_sensor_monitor.py
```

📖 **完整教學**: 查看 `Raspberry-Pi-部署指南.md` 第 5.1 節

---

## 🧪 測試功能

開啟應用後，按 **F12** 打開 Console，輸入：

```javascript
// 填充測試日記內容
testFillData()

// 觸發硬幣動畫（15個硬幣）
testCoinAnimation()

// 直接達到列印門檻
testShowPrint()
```

---

## 📖 文件閱讀順序建議

### 🎯 快速上手（10 分鐘）
1. 本文件 `README-開始使用.md` ← **你在這裡**
2. 開啟 `diary-reward.html` 體驗功能
3. 查看 `demo-showcase.html` 了解功能

### 🔧 深入了解（30 分鐘）
4. `專案結構說明.txt` - 理解專案結構
5. `日記獎勵系統-README.md` - 完整功能介紹

### 🚀 進階整合（1-2 小時）
6. `日記獎勵系統說明.md` - API 整合教學
7. `Raspberry-Pi-部署指南.md` - Pi 部署與硬體

---

## 🎨 自訂設定

### 修改主題顏色
```css
/* diary-reward-style.css */
:root {
    --primary-color: #4CAF50;      /* 改成你喜歡的顏色 */
    --secondary-color: #FF9800;
    --accent-color: #FFD700;
}
```

### 調整獎勵目標
```javascript
// diary-reward-script.js
const AppState = {
    targetReward: 100,  // 改成你想要的目標值
};
```

### 修改獎勵範圍
```javascript
// diary-reward-script.js 約第 220 行
const totalReward = Math.min(Math.max(baseReward + emotionBonus, 5), 30);
//                                                              ↑    ↑
//                                                             最小  最大
```

---

## 🆘 需要幫助？

### 常見問題

<details>
<summary><b>Q1: 語音輸入不工作？</b></summary>

**解決方案**:
- 使用 Chrome 或 Edge 瀏覽器
- 允許麥克風權限
- 確認麥克風正常運作
</details>

<details>
<summary><b>Q2: 硬幣動畫卡頓？</b></summary>

**解決方案**:
- 硬幣數量已限制在 20 個以內
- 關閉其他佔用資源的程式
- 使用較新的瀏覽器
</details>

<details>
<summary><b>Q3: 如何重置獎勵進度？</b></summary>

**解決方案**:
```javascript
// 瀏覽器 Console 執行
localStorage.clear()
location.reload()
```
</details>

<details>
<summary><b>Q4: Raspberry Pi 連線失敗？</b></summary>

**解決方案**:
1. 啟用 SSH: `sudo raspi-config` → SSH → Enable
2. 查看 IP: `hostname -I`
3. 使用 IP 連線: `ssh pi@192.168.1.XXX`
</details>

<details>
<summary><b>Q5: 檔案在哪裡？</b></summary>

**當前位置**:
```
C:\Users\geniu\OneDrive\文件\GitHub\yuhsiang
```

**主要檔案**:
- `diary-reward.html` - 主程式
- `啟動日記系統.bat` - Windows 啟動
- `快速開始-RaspberryPi.txt` - Pi 快速開始
</details>

---

## 🎯 快速命令參考

### Windows 用戶
```batch
REM 啟動應用
啟動日記系統.bat

REM 傳輸到 Pi
cd C:\Users\geniu\OneDrive\文件\GitHub\yuhsiang
scp diary-reward* pi@raspberrypi.local:~/
```

### Raspberry Pi 用戶
```bash
# 接收檔案（在 Pi 上執行）
cd ~

# 啟動伺服器
python3 -m http.server 8000

# 開啟瀏覽器
chromium-browser http://localhost:8000/diary-reward.html

# 設定自動啟動
nano ~/.config/lxsession/LXDE-pi/autostart
# 加入: @/home/pi/start-diary.sh
```

---

## 📱 支援平台

| 平台 | 狀態 | 備註 |
|------|------|------|
| ✅ Windows | 完整支援 | 使用 .bat 啟動 |
| ✅ macOS | 完整支援 | 使用 .sh 啟動 |
| ✅ Linux | 完整支援 | 使用 .sh 啟動 |
| ✅ Raspberry Pi | 專門優化 | 800x480 DSI 螢幕優化 |
| ✅ 桌面瀏覽器 | 完整支援 | Chrome/Edge/Firefox |
| ✅ 平板 | 完整支援 | 響應式設計 |
| ✅ 手機 | 完整支援 | 響應式設計 |

---

## 🎁 功能清單

### ✅ 已完成功能
- [x] 文字日記輸入
- [x] 語音日記錄音
- [x] AI 情緒分析（模擬）
- [x] 硬幣掉落動畫
- [x] 音效系統
- [x] 獎勵累積追蹤
- [x] 進度條顯示
- [x] 列印提示功能
- [x] 響應式設計
- [x] LocalStorage 資料持久化

### 🔧 可選整合
- [ ] ChatGPT API（可替換）
- [ ] 音效檔案（可替換）
- [ ] 熱感印紙機（可連接）
- [ ] 紅外線感應器（可連接）
- [ ] 雲端同步（未實作）

---

## 🌟 特色亮點

1. **✅ 完全可用** - 無需 API 即可體驗所有功能
2. **📖 文件完整** - 超過 2000 行的詳細說明
3. **🔧 易於整合** - 所有 API 位置清楚標註
4. **🎨 美觀設計** - 現代化 UI 與流暢動畫
5. **📱 響應式** - 支援所有裝置尺寸
6. **🍓 Pi 優化** - 專為 Raspberry Pi DSI 螢幕優化

---

## 🎉 立即開始！

### 🏃 最快速的方式（1 分鐘）

**Windows**:
```
雙擊: 啟動日記系統.bat
```

**macOS/Linux**:
```bash
bash 啟動日記系統.sh
```

**直接開啟**:
```
雙擊: diary-reward.html
```

---

## 📞 取得協助

- 📖 查看 `日記獎勵系統說明.md` - API 整合教學
- 🍓 查看 `Raspberry-Pi-部署指南.md` - Pi 部署教學
- 🎵 查看 `sounds/README.md` - 音效設定
- 📂 查看 `專案結構說明.txt` - 專案結構

---

<div align="center">

**📝 準備好開始你的日記旅程了嗎？**

[🚀 立即開始使用](#-立即開始)

Made with ❤️ for Raspberry Pi  
Version 1.0.0 | 2025

</div>

