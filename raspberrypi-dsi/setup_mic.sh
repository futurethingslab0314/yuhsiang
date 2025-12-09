#!/bin/bash

# check root
if [ "$EUID" -ne 0 ]; then
  echo "請使用 sudo 執行此腳本 (Please run as root)"
  exit 1
fi

echo "🎤 開始設置 INMP441 I2S 麥克風..."

CONFIG_FILE="/boot/config.txt"

# 檢測 Raspberry Pi OS Bookworm (Debian 12) 或更新版本的配置路徑
if [ -f "/boot/firmware/config.txt" ]; then
    CONFIG_FILE="/boot/firmware/config.txt"
    echo "ℹ️ 檢測到新版 OS，使用設定檔: $CONFIG_FILE"
fi

BACKUP_FILE="${CONFIG_FILE}.backup.$(date +%Y%m%d%H%M%S)"

# 備份 config.txt
echo "📦 備份配置文件到 $BACKUP_FILE"
cp "$CONFIG_FILE" "$BACKUP_FILE"

# 1. 啟用 I2S
if grep -q "dtparam=i2s=on" "$CONFIG_FILE"; then
    echo "✅ I2S 已經啟用"
else
    echo "设置 dtparam=i2s=on..."
    echo "dtparam=i2s=on" >> "$CONFIG_FILE"
fi

# 2. 添加 googlevoicehat-soundcard overlay (這是最通用的 I2S 麥克風驅動)
# 如果沒有這個 overlay，我們也可以嘗試手動編譯，但通常 RPi OS 內建了這個
if grep -q "dtoverlay=googlevoicehat-soundcard" "$CONFIG_FILE"; then
    echo "✅ googlevoicehat-soundcard overlay 已經存在"
else
    echo "添加 googlevoicehat-soundcard overlay..."
    echo "dtoverlay=googlevoicehat-soundcard" >> "$CONFIG_FILE"
fi

# 3. 確保 SPI 啟用 (有時 I2S 需要 SPI 依賴，雖不一定，但為了保險)
if grep -q "dtparam=spi=on" "$CONFIG_FILE"; then
    echo "✅ SPI 已啟用"
else
    echo "啟用 SPI..."
    echo "dtparam=spi=on" >> "$CONFIG_FILE"
fi

echo "----------------------------------------"
echo "🎉 設置完成！"
echo "請重新啟動樹莓派以應用更改："
echo "sudo reboot"
echo ""
echo "重新啟動後，請執行 ./test_mic.sh 進行測試"
