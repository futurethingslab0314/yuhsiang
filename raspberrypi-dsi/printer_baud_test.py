
import serial
import time

def test_baud_rates(port='/dev/serial0'):
    baud_rates = [9600, 19200, 38400, 57600, 115200]
    
    print(f"Testing baud rates on {port}...")
    print("This will print a test message at each baud rate.")
    
    for baud in baud_rates:
        print(f"\n--- Testing {baud} baud ---")
        try:
            ser = serial.Serial(
                port=port,
                baudrate=baud,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                bytesize=serial.EIGHTBITS,
                timeout=1
            )
            
            if ser.isOpen():
                # Wake up
                ser.write(b'\n')
                time.sleep(0.5)
                
                # Print identification
                msg = f"Baud Rate: {baud}\n".encode('utf-8')
                ser.write(msg)
                ser.write(b'If you can read this, the baud rate is correct!\n')
                ser.write(b'\n\n')
                
                time.sleep(1)
                ser.close()
            
        except Exception as e:
            print(f"Error at {baud}: {e}")
            
    print("\nTest complete. Check the printer output.")

if __name__ == "__main__":
    test_baud_rates()
