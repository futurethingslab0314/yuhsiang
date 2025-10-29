#!/bin/bash

echo "🧪 測試金幣日記系統環境設定"
echo "================================"
echo ""

# 檢查 .env 檔案
echo "📋 檢查環境變數檔案..."
if [ -f ".env" ]; then
    echo "  ✅ .env 檔案存在"
    
    # 檢查必要的環境變數
    if grep -q "OPENAI_API_KEY=" .env; then
        echo "  ✅ OPENAI_API_KEY 已設定"
    else
        echo "  ❌ 缺少 OPENAI_API_KEY"
    fi
    
    if grep -q "FIREBASE_PROJECT_ID=" .env; then
        echo "  ✅ FIREBASE_PROJECT_ID 已設定"
    else
        echo "  ❌ 缺少 FIREBASE_PROJECT_ID"
    fi
    
    if grep -q "FIREBASE_CLIENT_EMAIL=" .env; then
        echo "  ✅ FIREBASE_CLIENT_EMAIL 已設定"
    else
        echo "  ❌ 缺少 FIREBASE_CLIENT_EMAIL"
    fi
    
    if grep -q "FIREBASE_PRIVATE_KEY=" .env; then
        echo "  ✅ FIREBASE_PRIVATE_KEY 已設定"
    else
        echo "  ❌ 缺少 FIREBASE_PRIVATE_KEY"
    fi
else
    echo "  ❌ .env 檔案不存在"
    echo ""
    echo "請建立 .env 檔案並加入以下內容："
    echo "  OPENAI_API_KEY=sk-..."
    echo "  FIREBASE_PROJECT_ID=..."
    echo "  FIREBASE_CLIENT_EMAIL=..."
    echo "  FIREBASE_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----\""
    exit 1
fi

echo ""

# 檢查 Node.js
echo "🔧 檢查 Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "  ✅ Node.js 已安裝: $NODE_VERSION"
else
    echo "  ❌ Node.js 未安裝"
    echo "  請安裝 Node.js 18 或更新版本"
    exit 1
fi

echo ""

# 檢查 npm 套件
echo "📦 檢查 npm 套件..."
if [ -d "node_modules" ]; then
    echo "  ✅ node_modules 目錄存在"
    
    if [ -d "node_modules/openai" ]; then
        echo "  ✅ openai 套件已安裝"
    else
        echo "  ⚠️ openai 套件未安裝，執行 npm install"
        npm install
    fi
    
    if [ -d "node_modules/firebase-admin" ]; then
        echo "  ✅ firebase-admin 套件已安裝"
    else
        echo "  ⚠️ firebase-admin 套件未安裝，執行 npm install"
        npm install
    fi
else
    echo "  ⚠️ node_modules 不存在，執行 npm install"
    npm install
fi

echo ""

# 檢查重要檔案
echo "📄 檢查重要檔案..."
files=(
    "diary-reward.html"
    "server.js"
    "api/save-diary/index.js"
    "api/generate-guide/index.js"
    "api/generate-print/index.js"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ 缺少 $file"
    fi
done

echo ""
echo "================================"
echo "🎉 環境檢查完成！"
echo ""
echo "下一步："
echo "  1. 啟動伺服器: node server.js"
echo "  2. 在瀏覽器開啟: http://localhost:3000/diary-reward.html"
echo "  3. 按 F12 打開 Console 測試: showGuide()"
echo ""

