import serial
import time

def print_tiny_pattern():
    print("Testing Tiny Image Print...")
    try:
        ser = serial.Serial('/dev/serial0', 19200, timeout=1)
        ser.write(b'\x1B\x40') # Init
        time.sleep(0.5)
        
        # 定義一個超小的 8x8 點陣圖
        # GS v 0 m xL xH yL yH d1...dk
        # m=0
        # xL=1, xH=0 (1 byte width = 8 pixels)
        # yL=8, yH=0 (8 pixels height)
        # data = 8 bytes (比如 0xAA, 0x55 交錯)
        
        header = b'\x1D\x76\x30\x00'
        size = bytes([1, 0, 8, 0]) # x=1 byte, y=8 dots
        data = b'\xAA\x55\xAA\x55\xAA\x55\xAA\x55' # Checkerboard
        
        cmd = header + size + data
        
        ser.write(b'Tiny Image Start:\n')
        ser.write(cmd)
        ser.write(b'\nDone.\n\n\n')
        
        ser.close()
        print("Sent tiny image command.")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print_tiny_pattern()
