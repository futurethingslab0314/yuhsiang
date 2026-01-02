#!/usr/bin/env python3
import RPi.GPIO as GPIO
import time

# 設定 GPIO 模式為 BCM
GPIO.setmode(GPIO.BCM)

# 定義要測試的 PIN 腳位 (您可以修改這裡測試不同腳位)
TEST_PIN = 23

# 設定該腳位為輸入，並啟用內建的上拉電阻 (Pull-Up)
# 這樣沒按時是 HIGH (1)，按下接地時變 LOW (0)
GPIO.setup(TEST_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)

print(f"=== 簡易按鈕測試 (GPIO {TEST_PIN}) ===")
print(f"這是一個最基礎的測試，不依賴 pigpio。")
print(f"請確認您的按鈕接在:")
print(f"1. GPIO {TEST_PIN} (物理針腳第 16 號)")
print(f"2. GND (Ground) (例如物理針腳第 14 號)")
print("========================================")

try:
    last_state = GPIO.input(TEST_PIN)
    print(f"初始狀態: {'放開 (HIGH)' if last_state else '按下 (LOW)'}")
    
    while True:
        current_state = GPIO.input(TEST_PIN)
        
        if current_state != last_state:
            if current_state == 0:
                print("🚨 偵測到信號：按鈕被按下 (LOW)！")
            else:
                print("Test: 按鈕放開 (HIGH)")
            last_state = current_state
            
        time.sleep(0.1)

except KeyboardInterrupt:
    print("\n測試結束")
finally:
    GPIO.cleanup()
