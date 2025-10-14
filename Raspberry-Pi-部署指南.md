# 🍓 Raspberry Pi 部署指南 - 每日日記獎勵系統

> 完整的 Raspberry Pi 安裝、設定與自動啟動教學

---

## 📋 目錄

1. [硬體需求](#硬體需求)
2. [檔案傳輸](#檔案傳輸)
3. [環境設定](#環境設定)
4. [自動啟動設定](#自動啟動設定)
5. [硬體整合](#硬體整合)
6. [測試與除錯](#測試與除錯)
7. [常見問題](#常見問題)

---

## 🛠️ 硬體需求

### 基本配置
- ✅ Raspberry Pi 3B+ / 4 / Zero 2W (推薦 Pi 4)
- ✅ microSD 卡 (16GB 以上)
- ✅ 電源供應器 (5V 3A)
- ✅ 螢幕（或使用 DSI 觸控螢幕 800x480）
- ✅ 鍵盤、滑鼠（初次設定用）

### 選配硬體
- 🖨️ 熱感印紙機 (58mm/80mm)
- 📡 紅外線感應器模組
- 🎤 USB 麥克風（語音輸入用）
- 🔊 喇叭（音效播放）

---

## 📦 步驟 1: 檔案傳輸到 Raspberry Pi

### 方法 1: 使用 SCP (推薦)

#### 從 Windows 電腦傳輸
```bash
# 開啟 PowerShell 或 Git Bash
cd C:\Users\geniu\OneDrive\文件\GitHub\yuhsiang

# 傳輸日記系統檔案
scp diary-reward.html pi@raspberrypi.local:~/
scp diary-reward-style.css pi@raspberrypi.local:~/
scp diary-reward-script.js pi@raspberrypi.local:~/

# 傳輸整個 sounds 資料夾
scp -r sounds/ pi@raspberrypi.local:~/

# 傳輸說明文件
scp *.md pi@raspberrypi.local:~/
scp 啟動日記系統.sh pi@raspberrypi.local:~/
```

#### 從 macOS/Linux 傳輸
```bash
cd /path/to/yuhsiang

# 傳輸所有相關檔案
scp diary-reward* pi@raspberrypi.local:~/
scp -r sounds/ pi@raspberrypi.local:~/
scp *.md 啟動日記系統.sh pi@raspberrypi.local:~/
```

**提示**: 
- 預設帳號: `pi`
- 預設密碼: `raspberry`
- 如果 `raspberrypi.local` 無法連接，請使用 IP 位址

#### 查找 Raspberry Pi IP 位址
```bash
# 在 Raspberry Pi 上執行
hostname -I

# 或在路由器管理介面查看
# 或使用 IP 掃描工具: Advanced IP Scanner (Windows)
```

### 方法 2: 使用 USB 隨身碟

```bash
# 1. 將檔案複製到 USB 隨身碟
# 2. 將 USB 插入 Raspberry Pi
# 3. 在 Raspberry Pi 上執行:

# 掛載 USB
sudo mkdir -p /media/usb
sudo mount /dev/sda1 /media/usb

# 複製檔案
cp /media/usb/diary-reward* ~/
cp -r /media/usb/sounds ~/

# 卸載 USB
sudo umount /media/usb
```

### 方法 3: 使用 Git (如果專案在 GitHub)

```bash
# 在 Raspberry Pi 上執行
cd ~
git clone https://github.com/your-username/yuhsiang.git
cd yuhsiang

# 如果已經 clone，更新檔案
git pull origin main
```

---

## ⚙️ 步驟 2: 環境設定

### 1. 更新系統

```bash
# SSH 連線到 Raspberry Pi
ssh pi@raspberrypi.local

# 更新系統
sudo apt update
sudo apt upgrade -y
```

### 2. 安裝必要套件

```bash
# 安裝 Python 與 pip (通常已預裝)
sudo apt install python3 python3-pip -y

# 安裝 Chromium 瀏覽器 (通常已預裝)
sudo apt install chromium-browser -y

# 安裝 Flask (如需後端 API)
pip3 install flask flask-cors

# 安裝印紙機驅動 (如使用印紙機)
sudo apt install libcups2-dev -y
pip3 install python-escpos

# 安裝 GPIO 支援 (如使用感應器)
pip3 install RPi.GPIO
```

### 3. 設定檔案權限

```bash
cd ~

# 設定啟動腳本執行權限
chmod +x 啟動日記系統.sh

# 確認檔案存在
ls -la diary-reward*
```

---

## 🚀 步驟 3: 測試運行

### 手動啟動測試

```bash
# 方法 1: 使用啟動腳本
./啟動日記系統.sh

# 方法 2: 手動啟動 HTTP 伺服器
python3 -m http.server 8000

# 開啟瀏覽器測試
chromium-browser --start-fullscreen http://localhost:8000/diary-reward.html
```

### 檢查是否正常運作

- ✅ 網頁是否正常顯示
- ✅ 文字輸入是否正常
- ✅ 語音輸入是否有權限提示
- ✅ 按鈕點擊是否有反應
- ✅ 硬幣動畫是否流暢

---

## 🔄 步驟 4: 自動啟動設定

### 方法 1: 使用 Autostart (推薦 - 桌面環境)

```bash
# 1. 創建自動啟動目錄（如不存在）
mkdir -p ~/.config/autostart

# 2. 創建桌面應用檔案
nano ~/.config/autostart/diary-reward.desktop
```

**輸入以下內容**:
```ini
[Desktop Entry]
Type=Application
Name=每日日記獎勵系統
Exec=/home/pi/start-diary-system.sh
Terminal=false
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
```

**按 Ctrl+X → Y → Enter 儲存**

```bash
# 3. 創建啟動腳本
nano ~/start-diary-system.sh
```

**輸入以下內容**:
```bash
#!/bin/bash

# 等待系統完全啟動
sleep 10

# 進入專案目錄
cd /home/pi

# 啟動 HTTP 伺服器（背景執行）
python3 -m http.server 8000 > /dev/null 2>&1 &

# 等待伺服器啟動
sleep 3

# 開啟 Chromium 全螢幕模式
chromium-browser --kiosk --start-fullscreen \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-translate \
  --no-first-run \
  http://localhost:8000/diary-reward.html
```

**按 Ctrl+X → Y → Enter 儲存**

```bash
# 4. 設定執行權限
chmod +x ~/start-diary-system.sh

# 5. 測試啟動腳本
~/start-diary-system.sh
```

### 方法 2: 修改 LXDE autostart (替代方案)

```bash
# 編輯 autostart 檔案
nano ~/.config/lxsession/LXDE-pi/autostart
```

**在檔案最後加入**:
```bash
# 隱藏滑鼠游標（可選）
@unclutter -idle 0.1

# 停用螢幕保護
@xset s off
@xset -dpms
@xset s noblank

# 啟動日記系統
@/home/pi/start-diary-system.sh
```

**按 Ctrl+X → Y → Enter 儲存**

### 方法 3: 使用 systemd (無桌面環境)

```bash
# 1. 創建 service 檔案
sudo nano /etc/systemd/system/diary-reward.service
```

**輸入以下內容**:
```ini
[Unit]
Description=每日日記獎勵系統
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi
ExecStart=/usr/bin/python3 -m http.server 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**按 Ctrl+X → Y → Enter 儲存**

```bash
# 2. 啟用服務
sudo systemctl daemon-reload
sudo systemctl enable diary-reward.service
sudo systemctl start diary-reward.service

# 3. 檢查狀態
sudo systemctl status diary-reward.service

# 4. 查看日誌
sudo journalctl -u diary-reward.service -f
```

---

## 🔧 步驟 5: 硬體整合 (選配)

### 5.1 紅外線感應器 (投幣檢測)

#### 硬體連接
```
紅外線感應器 → Raspberry Pi GPIO
VCC     → 5V (Pin 2)
GND     → GND (Pin 6)
OUT     → GPIO 17 (Pin 11)
```

#### Python 監聽腳本
```bash
# 創建感應器腳本
nano ~/ir_sensor_monitor.py
```

**輸入以下內容**:
```python
#!/usr/bin/env python3
import RPi.GPIO as GPIO
import time
import requests

# 設定
IR_PIN = 17
API_URL = "http://localhost:8000/trigger-coin"

# GPIO 初始化
GPIO.setmode(GPIO.BCM)
GPIO.setup(IR_PIN, GPIO.IN)

print("🔍 紅外線感應器監聽中...")

try:
    last_trigger = 0
    while True:
        if GPIO.input(IR_PIN) == GPIO.LOW:  # 偵測到物體
            current_time = time.time()
            # 防止重複觸發 (1 秒內只觸發一次)
            if current_time - last_trigger > 1:
                print("💰 偵測到投幣動作！")
                try:
                    # 觸發前端動畫
                    requests.post(API_URL, timeout=1)
                    print("✅ 動畫已觸發")
                except:
                    print("⚠️ 無法連接前端")
                last_trigger = current_time
        time.sleep(0.1)
except KeyboardInterrupt:
    print("\n👋 停止監聽")
finally:
    GPIO.cleanup()
```

**按 Ctrl+X → Y → Enter 儲存**

```bash
# 設定執行權限
chmod +x ~/ir_sensor_monitor.py

# 測試執行
python3 ~/ir_sensor_monitor.py

# 設定開機自動執行
sudo nano /etc/rc.local
```

**在 `exit 0` 之前加入**:
```bash
# 啟動紅外線感應器監聽
/usr/bin/python3 /home/pi/ir_sensor_monitor.py > /dev/null 2>&1 &
```

### 5.2 熱感印紙機

#### 硬體連接
```
印紙機 → Raspberry Pi
- USB 連接: 直接插入 USB 埠
- 序列連接: TX → RX, RX → TX, GND → GND
```

#### 測試印紙機
```bash
# 查看 USB 裝置
lsusb

# 範例輸出:
# Bus 001 Device 004: ID 04b8:0e15 Seiko Epson Corp.

# 記下 vendor_id (04b8) 和 product_id (0e15)
```

#### Python 列印腳本
```bash
# 創建列印腳本
nano ~/print_ticket.py
```

**輸入以下內容**:
```python
#!/usr/bin/env python3
from escpos.printer import Usb
import sys

def print_ticket(content):
    try:
        # ⚠️ 替換為你的印紙機 ID
        p = Usb(0x04b8, 0x0e15)
        
        # 列印標題
        p.set(align='center', font='a', bold=True, width=2, height=2)
        p.text('✨ 專屬任務紙籤 ✨\n\n')
        
        # 列印內容
        p.set(align='left', font='a', bold=False, width=1, height=1)
        p.text(content + '\n\n')
        
        # 列印頁尾
        p.set(align='center')
        p.text('Keep Going! 🌟\n\n')
        
        # 切紙
        p.cut()
        
        print("SUCCESS: 列印完成")
        return True
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        content = sys.argv[1]
    else:
        content = "測試列印\n今天也要加油喔！💪"
    
    print_ticket(content)
```

**按 Ctrl+X → Y → Enter 儲存**

```bash
# 測試列印
python3 ~/print_ticket.py "測試列印成功！"
```

#### Flask API 後端
```bash
# 創建 API 伺服器
nano ~/printer_api.py
```

**輸入以下內容**:
```python
#!/usr/bin/env python3
from flask import Flask, request, jsonify
from flask_cors import CORS
from escpos.printer import Usb

app = Flask(__name__)
CORS(app)

@app.route('/api/print', methods=['POST'])
def print_ticket():
    try:
        data = request.json
        content = data.get('content', '測試列印')
        
        # 連接印紙機
        p = Usb(0x04b8, 0x0e15)
        
        # 列印內容
        p.set(align='center', font='a', bold=True, width=2, height=2)
        p.text('✨ 專屬任務紙籤 ✨\n\n')
        p.set(align='left', font='a', bold=False, width=1, height=1)
        p.text(content + '\n\n')
        p.set(align='center')
        p.text('Keep Going! 🌟\n\n')
        p.cut()
        
        return jsonify({'success': True, 'message': '列印成功'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/trigger-coin', methods=['POST'])
def trigger_coin():
    # 用於紅外線感應器觸發
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

**按 Ctrl+X → Y → Enter 儲存**

```bash
# 啟動 API 伺服器
python3 ~/printer_api.py
```

---

## 🧪 步驟 6: 測試與除錯

### 測試清單

```bash
# ✅ 測試 1: 檢查檔案
ls -la ~/diary-reward*

# ✅ 測試 2: 測試 HTTP 伺服器
python3 -m http.server 8000 &
curl http://localhost:8000/diary-reward.html

# ✅ 測試 3: 測試瀏覽器
chromium-browser http://localhost:8000/diary-reward.html

# ✅ 測試 4: 測試感應器 (如有)
python3 ~/ir_sensor_monitor.py

# ✅ 測試 5: 測試印紙機 (如有)
python3 ~/print_ticket.py "測試列印"

# ✅ 測試 6: 測試自動啟動
sudo reboot
# 重啟後觀察是否自動開啟
```

### 查看日誌

```bash
# 查看系統日誌
journalctl -xe

# 查看 Chromium 輸出
cat ~/.xsession-errors

# 查看 Python 伺服器日誌
ps aux | grep python
```

---

## 🐛 常見問題與解決

### Q1: 連線到 Raspberry Pi 失敗
```bash
# 解決方案 1: 啟用 SSH
sudo raspi-config
# 選擇: Interfacing Options → SSH → Enable

# 解決方案 2: 使用 IP 位址
# 在 Raspberry Pi 上查看 IP
hostname -I

# 從電腦連線
ssh pi@192.168.1.XXX
```

### Q2: 檔案傳輸失敗
```bash
# 檢查網路連線
ping raspberrypi.local

# 使用 USB 隨身碟替代
# 或使用 VNC 遠端桌面
```

### Q3: Chromium 不會自動全螢幕
```bash
# 修改啟動腳本，加入更多參數
chromium-browser --kiosk \
  --start-fullscreen \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --noerrdialogs \
  --disable-translate \
  http://localhost:8000/diary-reward.html
```

### Q4: 語音輸入沒有權限
```bash
# Chromium 需要安全連線才能使用麥克風
# 解決方案: 設定 HTTPS 或使用 localhost (已是 localhost)

# 檢查麥克風
arecord -l

# 測試錄音
arecord -d 5 test.wav
aplay test.wav
```

### Q5: 印紙機找不到
```bash
# 檢查 USB 連接
lsusb

# 檢查權限
sudo usermod -a -G lp pi
sudo usermod -a -G dialout pi

# 重新登入
logout
```

### Q6: 螢幕休眠或黑屏
```bash
# 停用螢幕保護
nano ~/.config/lxsession/LXDE-pi/autostart

# 加入以下內容
@xset s off
@xset -dpms
@xset s noblank
```

---

## 🎯 完整部署流程總結

### 快速部署 (5 分鐘)

```bash
# 1. 連線到 Raspberry Pi
ssh pi@raspberrypi.local

# 2. 接收檔案 (在你的電腦上執行)
scp diary-reward* pi@raspberrypi.local:~/

# 3. 在 Raspberry Pi 上測試
python3 -m http.server 8000 &
chromium-browser http://localhost:8000/diary-reward.html

# 4. 設定自動啟動
bash 啟動日記系統.sh

# 5. 重啟測試
sudo reboot
```

---

## 📱 遠端存取

### 區域網路存取
```bash
# 在 Raspberry Pi 上查看 IP
hostname -I
# 輸出: 192.168.1.XXX

# 在同網路的其他裝置瀏覽器開啟
# http://192.168.1.XXX:8000/diary-reward.html
```

### 使用 VNC 遠端桌面
```bash
# 啟用 VNC
sudo raspi-config
# Interface Options → VNC → Enable

# 下載 VNC Viewer: https://www.realvnc.com/en/connect/download/viewer/
# 連線到: raspberrypi.local 或 IP 位址
```

---

## 🔒 安全性建議

```bash
# 1. 更改預設密碼
passwd

# 2. 更新系統
sudo apt update && sudo apt upgrade -y

# 3. 設定防火牆 (如需對外開放)
sudo apt install ufw
sudo ufw allow 8000
sudo ufw enable

# 4. 停用 SSH (如不需要)
sudo systemctl disable ssh
```

---

## 📚 相關資源

- 官方文件: https://www.raspberrypi.org/documentation/
- GPIO 針腳圖: https://pinout.xyz/
- python-escpos: https://python-escpos.readthedocs.io/

---

## ✅ 部署檢查清單

- [ ] Raspberry Pi 系統更新完成
- [ ] 檔案成功傳輸到 Pi
- [ ] HTTP 伺服器可正常運行
- [ ] 瀏覽器可開啟應用程式
- [ ] 自動啟動腳本已設定
- [ ] 重啟後自動開啟應用
- [ ] (選配) 紅外線感應器正常運作
- [ ] (選配) 印紙機可正常列印
- [ ] (選配) 語音輸入可正常使用

---

**🎉 完成！您的 Raspberry Pi 日記獎勵系統已就緒！**

有任何問題請參考「日記獎勵系統說明.md」或「常見問題」章節。

