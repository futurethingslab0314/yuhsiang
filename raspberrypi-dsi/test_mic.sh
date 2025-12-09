#!/bin/bash

echo "🎤 麥克風測試工具"

# 檢查是否有錄音設備
echo "1. 檢查錄音設備列表 (arecord -l):"
arecord -l

# 獲取 I2S 卡的編號
CARD_NUM=$(arecord -l | grep "googlevoicehat" | awk '{print $2}' | sed 's/://')
if [ -z "$CARD_NUM" ]; then
    # 嘗試找其他的 I2S 卡名稱
    CARD_NUM=$(arecord -l | grep "snd_rpi_i2s" | awk '{print $2}' | sed 's/://')
fi

if [ -z "$CARD_NUM" ]; then
    echo "❌ 未找到 I2S 錄音設備！"
    echo "請確認您已執行 sudo ./setup_mic.sh 並重新啟動樹莓派"
    echo "也請檢查接線是否正確：SCK->18, WS->19, SD->20, VDD->3.3V, GND->GND"
    exit 1
else
    echo "✅ 找到錄音設備，卡號: $CARD_NUM"
fi

echo "----------------------------------------"
echo "2. 開始錄音測試 (5秒)..."
echo "請對麥克風說話..."
WAV_FILE="test_mic.wav"

# Recording with standard settings
# plughw allows sample rate conversion if needed
arecord -D plughw:$CARD_NUM,0 -d 5 -f S32_LE -r 48000 -c 2 "$WAV_FILE"

if [ $? -eq 0 ]; then
    echo "✅ 錄音完成！檔案: $WAV_FILE"
    
    echo "----------------------------------------"
    echo "3. 播放測試..."
    echo "正在播放錄製的聲音 (請確保喇叭已連接)..."
    aplay "$WAV_FILE"
else
    echo "❌ 錄音失敗"
fi

echo "----------------------------------------"
echo "清理..."
rm "$WAV_FILE"
