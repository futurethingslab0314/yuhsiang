#!/bin/bash

# check root
if [ "$EUID" -ne 0 ]; then
  # check if sudo is available
  if command -v sudo >/dev/null 2>&1; then
      echo "ℹ️ 此腳本需要使用 sudo 權限執行，正在嘗試提升權限..."
     # exec sudo "$0" "$@"
  else
      echo "⚠️ 請確認您有權限執行此指令"
  fi
fi

# 移動到腳本所在目錄
cd "$(dirname "$0")"

# 載入環境變數
ENV_FILE="../.env"
if [ -f "$ENV_FILE" ]; then
    echo "🔧 載入環境變數..."
    set -a
    source "$ENV_FILE"
    set +a
else
    echo "⚠️ 警告：找不到 .env 檔案，請確認您已設定好環境變數 (OPENAI_API_KEY 等)"
fi

echo "🎤 麥克風與上傳測試工具 (無麥克風模擬模式)"
echo "----------------------------------------"

# 檢查是否安裝了 espeak
if ! command -v espeak >/dev/null 2>&1; then
    echo "⚠️ 未找到 espeak，正在安裝..."
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update && sudo apt-get install -y espeak
    else
        echo "❌ 無法自動安裝 espeak，請手動安裝: sudo apt-get install espeak"
        exit 1
    fi
fi

TEST_WAV="test_voice_simulation.wav"

# 1. 產生測試音檔
echo "1. 產生測試語音檔 (使用 espeak)..."
# 使用 espeak 生成 wav 文件，內容為中文 "今天天氣真好，我想記錄這美好的一天"
# 注意：espeak 中文支援可能一般，我們用英文測試比較保險，或者用簡單中文
espeak -v zh -w "$TEST_WAV" "今天天氣真好，這是一條測試語音日記"

if [ ! -f "$TEST_WAV" ]; then
    echo "❌ 音檔生成失敗，嘗試生成英文測試..."
    espeak -w "$TEST_WAV" "Hello, this is a test simulation for voice diary."
fi

if [ -f "$TEST_WAV" ]; then
    echo "✅ 音檔已生成: $TEST_WAV"
else
    echo "❌ 音檔生成失敗"
    exit 1
fi

# 2. 執行 voice_input_manager
echo "----------------------------------------"
echo "2. 執行語音識別與上傳流程..."
echo "正在執行: python3 voice_input_manager.py --audio $TEST_WAV"

# 檢查依賴
if ! python3 -c "import openai" 2>/dev/null; then
    echo "⚠️ 未安裝 openai 套件，嘗試安裝..."
    pip3 install openai requests
fi

python3 voice_input_manager.py --audio "$TEST_WAV"

RET=$?
if [ $RET -eq 0 ]; then
    echo "----------------------------------------"
    echo "✅ 測試完成！"
    echo "如果看到 'upload_result' 成功，表示資料已寫入 Firebase。"
else
    echo "----------------------------------------"
    echo "❌ 測試失敗 (Exit Code: $RET)"
    echo "請檢查錯誤訊息，可能是 API Key 設定問題或網路問題。"
fi

# 清理
rm -f "$TEST_WAV"
