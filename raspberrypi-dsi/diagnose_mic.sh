#!/bin/bash

echo "🔍 麥克風音訊診斷工具"
echo "========================================"

# 1. 列出所有錄音裝置
echo "1. 偵測到的錄音裝置 (arecord -l):"
arecord -l
echo "----------------------------------------"

# 2. 嘗試自動尋找 I2S 裝置
# 通常是 "googlevoicehat" 或 "snd_rpi_i2s_card"
CARD_NUM=$(arecord -l | grep -iE "googlevoicehat|snd_rpi_i2s" | grep -oP "card \K\d+")

if [ -z "$CARD_NUM" ]; then
    echo "⚠️ 無法自動偵測到 I2S 麥克風，將使用預設 device 0"
    DEVICE="plughw:0,0"
else
    echo "✅ 自動選取 Card $CARD_NUM"
    DEVICE="plughw:$CARD_NUM,0"
fi

echo "使用錄音裝置: $DEVICE"
echo "----------------------------------------"

# 3. 錄製 5 秒測試音訊
TEST_FILE="mic_test_raw.wav"
echo "🎤 正在錄音 5 秒測試... (請對著麥克風說話)"
# S32_LE 是 INMP441 常用的格式
arecord -D "$DEVICE" -d 5 -f S32_LE -r 44100 -c 2 "$TEST_FILE"

if [ $? -ne 0 ]; then
    echo "❌ 錄音指令執行失敗！"
    exit 1
fi

echo "✅ 錄音完成"
echo "----------------------------------------"

# 4. 分析音量 (使用 ffmpeg volumedetect)
if command -v ffmpeg >/dev/null 2>&1; then
    echo "📊 音訊分析報告:"
    # 輸出 volumedetect 到 stderr，我們將其捕獲並顯示
    ffmpeg -i "$TEST_FILE" -af "volumedetect" -f null /dev/null 2>&1 | grep -E "mean_volume|max_volume|histogram"
    
    echo ""
    echo "解讀說明:"
    echo "  - max_volume: 如果是 -90dB 或更低，代表完全靜音（硬體未連接或驅動錯誤）。"
    echo "  - max_volume: 如果是 -30dB 到 0dB，代表有收到聲音。"
    echo "  - mean_volume: 平均音量，正常說話應該在 -30dB ~ -15dB 左右。"
else
    echo "⚠️ 未安裝 ffmpeg，無法進行數值分析。"
fi

echo "----------------------------------------"
echo "您可以嘗試播放此檔案來檢查聲音: aplay $TEST_FILE"
