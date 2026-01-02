
import serial
import time

def test_baud_rate(baud):
    print(f"Testing baud rate: {baud}...")
    try:
        # Open serial port
        ser = serial.Serial('/dev/serial0', baud, timeout=1)
        
        # Send reset and a clear text message
        ser.write(b'\x1B\x40') # Initialize
        time.sleep(0.5)
        
        msg = f"BAUD RATE CHECK: {baud}\n"
        ser.write(msg.encode('utf-8'))
        ser.write(b"If you can read this, the baud rate is correct!\n")
        ser.write(b"-----------------------------------------------\n\n\n")
        
        ser.close()
        time.sleep(1) # Wait for print to finish
        
    except Exception as e:
        print(f"Failed at {baud}: {e}")

if __name__ == "__main__":
    print("WARNING: This will print a few lines for each baud rate.")
    print("Watch the printer to see which one is readable.\n")
    
    # Common thermal printer baud rates
    rates = [9600, 19200, 38400, 57600, 115200]
    
    for r in rates:
        test_baud_rate(r)
        
    print("\nTest complete. Which baud rate produced readable text?")
