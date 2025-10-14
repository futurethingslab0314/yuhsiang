@echo off
chcp 65001 >nul
REM ========================================
REM 每日日記獎勵系統 - Windows 啟動腳本
REM ========================================

echo.
echo 🚀 啟動每日日記獎勵系統...
echo.

REM 檢查是否在正確的目錄
if not exist "diary-reward.html" (
    echo ❌ 錯誤：找不到 diary-reward.html
    echo 請確認你在正確的目錄中執行此腳本
    pause
    exit /b 1
)

REM 檢查 Python 是否安裝
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 錯誤：找不到 Python
    echo 請先安裝 Python 3
    echo 下載位址：https://www.python.org/downloads/
    pause
    exit /b 1
)

echo ✅ Python 已找到
echo.

REM 設定端口
set PORT=8000

REM 顯示啟動訊息
echo ================================================
echo   📝 每日日記獎勵系統
echo ================================================
echo.
echo 伺服器位址：
echo   🌐 http://localhost:%PORT%/diary-reward.html
echo   🌐 http://127.0.0.1:%PORT%/diary-reward.html
echo.
echo 💡 提示：
echo   - 按 Ctrl+C 停止伺服器
echo   - 建議使用 Chrome 或 Edge 瀏覽器
echo   - 語音功能需要麥克風權限
echo.
echo ================================================
echo.

REM 等待 2 秒
timeout /t 2 /nobreak >nul

REM 開啟瀏覽器
echo 🔍 開啟瀏覽器...
start http://localhost:%PORT%/diary-reward.html

echo.
echo 🔄 啟動本地伺服器...
echo.

REM 啟動 Python HTTP 伺服器
python -m http.server %PORT%

REM 如果伺服器停止
echo.
echo 👋 伺服器已停止
echo 感謝使用每日日記獎勵系統！
pause

