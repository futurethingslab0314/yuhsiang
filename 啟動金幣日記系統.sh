#!/bin/bash

echo "🚀 啟動金幣日記系統..."
echo ""

cd ~/yuhsiang

# 檢查 .env 檔案
if [ ! -f ".env" ]; then
    echo "⚠️ 警告: .env 檔案不存在"
    echo "請確認環境變數已設定"
fi

# 啟動 Vercel dev
echo "正在啟動 Vercel 開發伺服器..."
echo ""
echo "📍 啟動後請在瀏覽器打開:"
echo "   http://localhost:3000/diary-reward.html"
echo ""
echo "💡 提示: 按 Ctrl+C 停止伺服器"
echo ""

npx vercel dev

