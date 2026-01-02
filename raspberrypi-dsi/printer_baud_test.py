import serial
import time

def test_baud(baud):
    print(f"Testing baudrate: {baud}...")
    try:
        # 嘗試開啟 serial port
        ser = serial.Serial('/dev/serial0', baud, timeout=1)
        
        # 初始化指令
        ser.write(b'\x1B\x40') 
        time.sleep(0.5)
        
        # 印出測試文字
        msg = f"Baudrate {baud} OK!\n"
        ser.write(msg.encode('utf-8'))
        ser.write(b'\n\n')
        
        ser.close()
    except Exception as e:
        print(f"Error at {baud}: {e}")

print("--- Printer Baudrate Test ---")
# 測試常見的三種速度
test_baud(9600)
time.sleep(2)
test_baud(19200)
time.sleep(2)
test_baud(115200)
print("--- Test Finished ---")
