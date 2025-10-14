# 音效檔案說明

本資料夾用於存放日記獎勵系統所需的音效檔案。

## 📂 所需檔案

### 1. coin-drop.mp3
**用途**: 硬幣掉落音效  
**觸發時機**: 提交日記後、投幣動作時  
**建議規格**:
- 格式: MP3 或 WAV
- 長度: 0.5-1 秒
- 音量: 適中，不刺耳

### 2. success.mp3 (可選)
**用途**: 達成目標音效  
**觸發時機**: 累積獎勵達到 100 枚硬幣時  
**建議規格**:
- 格式: MP3
- 長度: 1-2 秒
- 音調: 歡快、激勵

### 3. print.mp3 (可選)
**用途**: 列印開始音效  
**觸發時機**: 開始列印紙籤時  
**建議規格**:
- 格式: MP3
- 長度: 0.5-1 秒

## 🎵 免費音效資源

### 推薦網站

1. **Freesound** (https://freesound.org/)
   - 搜尋關鍵字: "coin", "drop", "money", "reward"
   - 需註冊帳號
   - 注意授權條款

2. **Mixkit** (https://mixkit.co/free-sound-effects/)
   - 無需註冊
   - 商業使用免費
   - 分類清楚

3. **Zapsplat** (https://www.zapsplat.com/)
   - 需免費註冊
   - 每日下載限制
   - 品質高

4. **YouTube Audio Library**
   - 需 Google 帳號
   - 音效免費
   - 可用於任何專案

### 推薦音效

**硬幣音效**:
- "Coin Collect" by Mixkit
- "Arcade Coin" by Freesound
- "Cash Register" 系列

**成功音效**:
- "Success Bell" by Mixkit
- "Level Up" by Freesound
- "Achievement" 系列

## 🔧 使用方式

1. 下載音效檔案
2. 重新命名為 `coin-drop.mp3`
3. 放置在此資料夾 (`sounds/`)
4. 確認檔案路徑正確
5. 重新載入網頁測試

## 🎚️ 音量調整

如果音效太大聲或太小聲，在 `diary-reward-script.js` 中調整：

```javascript
function playCoinSound() {
    const audio = new Audio('sounds/coin-drop.mp3');
    audio.volume = 0.5;  // 調整這個值 (0.0 - 1.0)
    audio.play();
}
```

## 🔇 備用方案

如果沒有音效檔案，系統會使用 Web Audio API 生成簡單的嗶嗶聲，功能不受影響。

## 📝 授權注意事項

使用音效時請注意：
- ✅ 確認音效可商業使用（如果需要）
- ✅ 遵守授權條款（如需標註來源）
- ✅ 不要使用有版權的音效
- ✅ 建議使用 CC0 或 Public Domain 授權

## 🎼 自製音效

### 使用 Audacity (免費軟體)

1. 下載 Audacity: https://www.audacityteam.org/
2. 生成 → 音調...
3. 選擇頻率 (如 800Hz)
4. 調整長度 (如 0.3 秒)
5. 效果 → 淡出
6. 匯出為 MP3

### 使用線上工具

- **JFXR**: https://jfxr.frozenfractal.com/
  - 專為遊戲音效設計
  - 直接在瀏覽器生成
  - 可匯出 WAV

- **Bfxr**: https://www.bfxr.net/
  - Flash 音效生成器
  - 適合 8-bit 風格
  - 可匯出多種格式

---

**提示**: 如果遇到音效無法播放的問題，請確認：
1. 檔案路徑正確
2. 檔案格式支援
3. 瀏覽器允許自動播放音效
4. 音量未靜音

