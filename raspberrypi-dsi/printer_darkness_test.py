
import serial
import time

def test_darkness(port='/dev/serial0', baudrate=19200):
    try:
        ser = serial.Serial(port, baudrate, timeout=1)
        
        # 1. 測試預設濃度
        print("Printing with default settings...")
        ser.write(b'\x1B\x40') # Reset
        ser.write(b'\nDefault Darkness Test\n')
        ser.write(b'-------------------\n\n\n')
        time.sleep(1)
        
        # 2. 測試高濃度 (增加加熱時間)
        # ESC 7 n1 n2 n3
        # n1: Max dots (default around 7)
        # n2: Heating time (default around 80, max 255) -> 設為 200 (\xC8)
        # n3: Heating interval (default around 2)
        print("Printing with HIGH darkness...")
        ser.write(b'\x1B\x37\x07\xC8\x02') 
        
        # 部分印表機也支援 GS ( E 指令，嘗試同時發送
        # Set density to roughly 120%
        # ser.write(b'\x1D\x28\x45\x04\x00\x06\x01\x1E\x01') 

        ser.write(b'High Darkness Test\n')
        ser.write(b'If this is darker,\n')
        ser.write(b'we can fix it!\n')
        ser.write(b'-------------------\n\n\n')
        
        ser.close()
        print("Test complete.")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_darkness()
