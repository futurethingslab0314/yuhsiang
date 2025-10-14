#!/bin/bash

# ========================================
# 每日日記獎勵系統 - 快速啟動腳本
# ========================================

echo "🚀 啟動每日日記獎勵系統..."
echo ""

# 檢查是否在正確的目錄
if [ ! -f "diary-reward.html" ]; then
    echo "❌ 錯誤：找不到 diary-reward.html"
    echo "請確認你在正確的目錄中執行此腳本"
    exit 1
fi

# 檢查 Python 是否安裝
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ 錯誤：找不到 Python"
    echo "請先安裝 Python 3"
    exit 1
fi

# 選擇 Python 指令
PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

echo "✅ Python 已找到: $PYTHON_CMD"
echo ""

# 選擇端口
PORT=8000

# 檢查端口是否被佔用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️ 警告：端口 $PORT 已被使用"
    echo "嘗試使用端口 8001..."
    PORT=8001
fi

# 顯示啟動訊息
echo "================================================"
echo "  📝 每日日記獎勵系統"
echo "================================================"
echo ""
echo "伺服器位址："
echo "  🌐 http://localhost:$PORT/diary-reward.html"
echo "  🌐 http://127.0.0.1:$PORT/diary-reward.html"
echo ""

# 如果在 Raspberry Pi 上，顯示區域網路 IP
if [ -f /proc/device-tree/model ] && grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    echo "📱 區域網路訪問："
    echo "  🌐 http://$LOCAL_IP:$PORT/diary-reward.html"
    echo ""
fi

echo "💡 提示："
echo "  - 按 Ctrl+C 停止伺服器"
echo "  - 建議使用 Chrome 或 Firefox 瀏覽器"
echo "  - 語音功能需要麥克風權限"
echo ""
echo "================================================"
echo ""

# 等待 2 秒讓使用者看到訊息
sleep 2

# 嘗試自動開啟瀏覽器
echo "🔍 嘗試開啟瀏覽器..."

# 定義 URL
URL="http://localhost:$PORT/diary-reward.html"

# 根據作業系統開啟瀏覽器
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "$URL" 2>/dev/null &
    echo "✅ 已在 macOS 上開啟瀏覽器"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v xdg-open &> /dev/null; then
        xdg-open "$URL" 2>/dev/null &
        echo "✅ 已在 Linux 上開啟瀏覽器"
    elif command -v chromium-browser &> /dev/null; then
        # Raspberry Pi
        chromium-browser "$URL" 2>/dev/null &
        echo "✅ 已開啟 Chromium 瀏覽器"
    fi
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows (Git Bash)
    start "$URL" 2>/dev/null &
    echo "✅ 已在 Windows 上開啟瀏覽器"
else
    echo "⚠️ 無法自動開啟瀏覽器"
    echo "請手動複製上方網址到瀏覽器"
fi

echo ""
echo "🔄 啟動本地伺服器..."
echo ""

# 啟動 Python HTTP 伺服器
$PYTHON_CMD -m http.server $PORT

# 如果伺服器停止
echo ""
echo "👋 伺服器已停止"
echo "感謝使用每日日記獎勵系統！"

