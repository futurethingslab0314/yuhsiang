
import serial
import serial.tools.list_ports
import time
import os
import sys

def check_permissions():
    print("\n--- Checking Permissions ---")
    user = os.getenv('USER')
    print(f"Current User: {user}")
    
    try:
        groups = os.popen('groups').read().strip().split()
        print(f"Groups: {groups}")
        if 'dialout' in groups:
            print("✅ User is in 'dialout' group.")
        else:
            print("❌ User is NOT in 'dialout' group. Please run: sudo usermod -a -G dialout $USER")
    except Exception as e:
        print(f"Failed to check groups: {e}")

def list_serial_ports():
    print("\n--- Scanning Serial Ports ---")
    ports = list(serial.tools.list_ports.comports())
    found_ports = []
    
    # Also check typical Pi ports manually if not found by comports
    candidates = ['/dev/serial0', '/dev/ttyAMA0', '/dev/ttyS0', '/dev/ttyUSB0']
    
    for c in candidates:
        if os.path.exists(c):
            found_ports.append(c)
            print(f"Found existing device file: {c}")
            
    for p in ports:
        print(f"Detected: {p.device} - {p.description}")
        if p.device not in found_ports:
            found_ports.append(p.device)
            
    if not found_ports:
        print("❌ No serial ports found!")
    
    return found_ports

def test_print(port, baudrate=19200):
    print(f"\n--- Testing Port: {port} at {baudrate} ---")
    try:
        ser = serial.Serial(
            port=port,
            baudrate=baudrate,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            bytesize=serial.EIGHTBITS,
            timeout=2
        )
        
        if ser.isOpen():
            print("✅ Port opened successfully.")
            
            # Send wake up
            ser.write(b'\n')
            time.sleep(0.5)
            
            # Basic test
            msg = f"Diagnostic Test\nPort: {port}\nBaud: {baudrate}\n\n\n".encode('utf-8')
            ser.write(msg)
            print("✅ Data sent. Did it print?")
            
            ser.close()
            return True
    except serial.SerialException as e:
        print(f"❌ Connection failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def main():
    print("========================================")
    print("      Printer Diagnostic Tool")
    print("========================================")
    
    check_permissions()
    
    ports = list_serial_ports()
    
    print("\n--- Starting Print Tests ---")
    
    # Try the default first
    default_port = '/dev/serial0'
    if default_port in ports:
        test_print(default_port)
    else:
        print(f"⚠️ Default port {default_port} not found.")
        
    # Ask user to test others
    for p in ports:
        if p != default_port:
            response = input(f"\nDo you want to test {p}? (y/n): ")
            if response.lower() == 'y':
                test_print(p)

if __name__ == "__main__":
    main()
