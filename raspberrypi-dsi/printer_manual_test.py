
import serial
import time
import sys

def test_printer(port='/dev/serial0', baudrate=9600):
    """
    Test the thermal printer connected to the specified serial port.
    
    Args:
        port (str): The serial port path (default: /dev/serial0).
        baudrate (int): The baud rate (default: 9600).
    """
    print(f"Opening serial port {port} at {baudrate} baud...")
    
    try:
        # Initialize serial connection
        ser = serial.Serial(
            port=port,
            baudrate=baudrate,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            bytesize=serial.EIGHTBITS,
            timeout=1
        )
        
        if ser.isOpen():
            print("Serial port opened successfully.")
            
            # Send wake-up calls (just in case)
            ser.write(b'\n')
            time.sleep(0.5)
            
            # Print simple text
            print("Sending test text...")
            ser.write(b'Hello World!\n')
            ser.write(b'Thermal Printer Test\n')
            ser.write(b'--------------------\n')
            ser.write(b'If you can read this,\n')
            ser.write(b'the printer is working!\n')
            ser.write(b'\n\n\n')  # Feed a few lines
            
            print("Test data sent.")
            
            # Close connection
            ser.close()
            print("Serial port closed.")
            
        else:
            print("Failed to open serial port.")
            
    except serial.SerialException as e:
        print(f"Error: {e}")
        print("\nTroubleshooting tips:")
        print("1. Ensure UART is enabled in raspi-config.")
        print("2. Ensure the serial console is disabled in raspi-config.")
        print("3. Check if your user is in the 'dialout' group (sudo usermod -a -G dialout $USER).")
        print("4. Verify the port name (try /dev/ttyS0 or /dev/ttyAMA0 if serial0 fails).")

if __name__ == "__main__":
    # Allow command line arguments for port and baudrate
    port = sys.argv[1] if len(sys.argv) > 1 else '/dev/serial0'
    baudrate = int(sys.argv[2]) if len(sys.argv) > 2 else 9600
    
    test_printer(port, baudrate)
