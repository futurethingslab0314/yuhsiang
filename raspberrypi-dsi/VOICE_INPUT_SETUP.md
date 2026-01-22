# 🎙️ 樹莓派 + INMP441 語音輸入整合指南

本指南說明如何在樹莓派上使用 INMP441 I2S 麥克風，透過 `voice_input_manager.py` 完成「錄音 ➜ OpenAI 語音轉文字 ➜ Firebase」全流程。

---

## 1. 硬體接線

| INMP441 | Raspberry Pi (BCM) | 備註 |
|---------|-------------------|------|
| VCC     | 3V3 (Pin 1)       | 使用 3.3V 電源 |
| GND     | GND (Pin 6)       | 共地 |
| LRCL    | GPIO18 (Pin 12)   | I2S LRCLK |
| BCLK    | GPIO19 (Pin 35)   | I2S BCLK |
| DOUT    | GPIO20 (Pin 38)   | I2S DIN |
| WS      | GPIO21 (Pin 40)   | I2S FSYNC |

> **注意**：INMP441 只有輸出腳位（DOUT），不需要 DIN。

---

## 2. 啟用 I2S 驅動

1. 編輯 `/boot/firmware/config.txt`（Bullseye/Bookworm）或 `/boot/config.txt`（Legacy）：
   ```bash
   sudo nano /boot/firmware/config.txt
   ```
2. 在檔案結尾加入：
   ```
   dtparam=i2s=on
   dtoverlay=googlevoicehat-soundcard
   ```
3. 重新開機：
   ```bash
   sudo reboot
   ```

---

## 3. 安裝系統套件與 Python 依賴

```bash
sudo apt update
sudo apt install -y alsa-utils ffmpeg

cd ~/Documents/GitHub/yuhsiang/raspberrypi-dsi
pip3 install -r requirements.txt
```

---

## 4. 設定 `.env` 或環境變數

```bash
# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
OPENAI_STT_MODEL=gpt-4o-mini-transcribe    # 可選

# 麥克風與錄音
MIC_DEVICE=plughw:2,0
MIC_MAX_DURATION=20

# Firebase API
VOICE_DIARY_API_URL=https://yuhsiang.vercel.app/api/save-diary
VOICE_DIARY_USER_ID=your-user-id
VOICE_DIARY_ATTACH_AUDIO=false
```

> `MIC_DEVICE` 可使用 `arecord -l` 查詢卡號 (`hw:<card>,<device>`) 後改成 `plughw:<card>,<device>`。

---

## 5. 驗證麥克風輸入

```bash
arecord -l                      # 列出錄音裝置
arecord -D plughw:2,0 -f S32_LE -r 16000 -c 1 -d 5 /tmp/test.wav
aplay /tmp/test.wav
```

若能聽到聲音且沒有雜訊，表示 INMP441 已經就緒。

---

## 6. 執行錄音 ➜ STT ➜ Firebase

```bash
cd ~/Documents/GitHub/yuhsiang/raspberrypi-dsi
python3 voice_input_manager.py --duration 12
```

- `--duration`：錄音秒數，預設讀取 `MIC_MAX_DURATION`。
- `--skip-upload`：僅轉寫，不寫入 Firebase。
- `--audio path/to/file.wav`：使用既有音檔，跳過錄音流程。
- `--keep-files`：保留轉檔後的 WAV，方便除錯。

執行後終端機會輸出 JSON 結果並顯示 Firebase 上傳狀態。

---

## 7. 與按鈕流程整合（範例）

```python
from voice_input_manager import VoiceInputManager

vim = VoiceInputManager()

def on_mic_button_pressed():
    try:
        result = vim.process_once(duration=12)
        print("文字內容:", result['text'])
    except Exception as exc:
        print(f"語音輸入失敗: {exc}")
```

在 `button_handler` 的短按或長按事件中呼叫 `on_mic_button_pressed()` 即可。

---

## 8. 常見問題

| 問題 | 解法 |
|------|------|
| `arecord: device busy` | 確認沒有其他錄音程式佔用裝置，可重開機或 `sudo fuser -v /dev/snd/*` |
| `OpenAI 語音轉文字失敗` | 檢查 API Key、模型名稱，或網路是否可連線到 `api.openai.com` |
| Firebase 回傳 401/403 | 確認 `FIREBASE_*` 相關環境變數已設定在 Vercel 或 API 端 |
| 音檔檔案大小 0 KB | 代表 INMP441 未輸出資料，檢查接線與 `config.txt` 設定 |

---

完成以上步驟後，就能透過樹莓派硬體按鈕或 CLI 指令，將語音內容自動轉寫成文字並同步到 Firebase 🎉。


