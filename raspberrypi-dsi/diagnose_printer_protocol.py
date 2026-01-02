
import serial
import time

def test_protocol():
    port = '/dev/serial0'
    baud = 19200
    
    print(f"Testing Printer Protocol at {baud}...")
    
    try:
        ser = serial.Serial(port, baud, timeout=1)
        
        # 1. Reset
        ser.write(b'\x1B\x40')
        time.sleep(0.5)
        
        # 2. Print Text Header
        ser.write(b"Protocol Test: Start\n")
        time.sleep(0.5)
        
        # 3. Test GS v 0 (Raster Mode) - Tiny Square
        # Width: 1 byte (8 dots)
        # Height: 8 lines
        # Data: 8 bytes of 0xFF (Solid block)
        print("Sending GS v 0 (Raster) command...")
        # GS v 0 m xL xH yL yH d1...dk
        # m=0, xL=1, xH=0, yL=8, yH=0
        cmd = b'\x1D\x76\x30\x00\x01\x00\x08\x00'
        data = b'\xFF' * 8 
        
        ser.write(b"1. GS v 0 (Raster): ")
        ser.write(cmd + data)
        ser.write(b"\n")
        time.sleep(1)
        
        # 4. Test ESC * (Bit Image Mode) - Standard Mode
        # ESC * m nL nH d1...dk
        # m=0 (8-dot single-density), nL=8, nH=0 (8 columns)
        # Data: 8 bytes (Columns)
        print("Sending ESC * (Bit Image) command...")
        cmd = b'\x1B\x2A\x00\x08\x00'
        data = b'\xFF' * 8
        
        ser.write(b"2. ESC * (BitImg): ")
        ser.write(cmd + data)
        ser.write(b"\n") # Print buffer
        time.sleep(1)
        
        # 5. Footer
        ser.write(b"Protocol Test: End\n\n\n")
        
        ser.close()
        print("Done. Check printout.")
        print("If '1. GS v 0' produced garbage but '2. ESC *' produced a square/line -> Your printer only supports ESC *.")
        print("If both produced garbage -> Baud rate or connection issue.")
        print("If '1. GS v 0' worked -> Buffer overflow was the issue before.")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_protocol()
