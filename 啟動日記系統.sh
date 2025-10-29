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

# 檢查 Node.js 是否安裝
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤：找不到 Node.js"
    echo "請先安裝 Node.js 18 或更新版本"
    exit 1
fi

echo "✅ Node.js 已找到: $(node -v)"
echo ""

# 顯示啟動訊息
echo "================================================"
echo "  📝 每日日記獎勵系統"
echo "================================================"
echo ""
echo "伺服器位址（啟動後會顯示）："
echo "  🌐 http://localhost:3000/diary-reward.html"
echo ""

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
URL="http://localhost:3000/diary-reward.html"

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
echo "🔄 啟動開發伺服器（使用 Vercel）..."
echo ""
echo "⚠️ 注意：此系統需要 Vercel 來運行 API"
echo ""

# 啟動 Vercel dev
npx vercel dev

# 如果伺服器停止
echo ""
echo "👋 伺服器已停止"
echo "感謝使用每日日記獎勵系統！"

