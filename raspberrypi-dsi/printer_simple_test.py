import serial
import time

try:
    print("Testing Printer at 19200...")
    ser = serial.Serial('/dev/serial0', 19200, timeout=1)
    
    # Initialize
    ser.write(b'\x1B\x40')
    time.sleep(0.5)
    
    # Print Text
    ser.write(b'Hello World!\n')
    ser.write(b'Printer Test OK.\n')
    ser.write(b'\n\n\n')
    
    ser.close()
    print("Command sent.")
    
except Exception as e:
    print(f"Error: {e}")
