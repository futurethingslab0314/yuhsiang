#!/bin/bash
# 甦醒地圖啟動腳本

# 設定工作目錄
cd /home/future/yuhsiang/raspberrypi-dsi

# 殺掉舊的行程 (避免重複執行)
pkill -f "python3 main_web_dsi.py"
sudo killall pigpiod 2>/dev/null

# 啟動主程式
# 使用 lxterminal 開一個視窗來顯示 Log，方便除錯
# 如果想要背景執行，可以拿掉 lxterminal -e
lxterminal -e "python3 main_web_dsi.py"
