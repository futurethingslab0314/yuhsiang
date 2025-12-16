
import serial
import time
import logging
import threading
from typing import Optional, Dict, Any

class PrinterManager:
    def __init__(self, port: str = '/dev/serial0', baudrate: int = 19200):
        """
        Initialize the thermal printer manager.
        """
        self.logger = logging.getLogger(self.__class__.__name__)
        self.port = port
        self.baudrate = baudrate
        self.lock = threading.Lock()
        self._connection_check()

    def _connection_check(self):
        """Check if we can open the serial port"""
        try:
            with serial.Serial(self.port, self.baudrate, timeout=1) as ser:
                pass
            self.logger.info(f"Printer connection check to {self.port} successful.")
        except serial.SerialException as e:
            self.logger.warning(f"Printer connection check failed: {e}. Printer might not work.")

    def print_text(self, text: str):
        """Print simple text to the thermal printer"""
        with self.lock:
            try:
                with serial.Serial(
                    port=self.port,
                    baudrate=self.baudrate,
                    parity=serial.PARITY_NONE,
                    stopbits=serial.STOPBITS_ONE,
                    bytesize=serial.EIGHTBITS,
                    timeout=1
                ) as ser:
                    # Wake up/Initialize
                    ser.write(b'\x1B\x40') # Initialize printer
                    time.sleep(0.1)
                    
                    # Encode and print
                    if isinstance(text, str):
                        data = text.encode('utf-8', errors='ignore')
                    else:
                        data = text
                        
                    ser.write(data)
                    ser.write(b'\n')
                    
            except Exception as e:
                self.logger.error(f"Failed to print text: {e}")

    def print_reward_ticket(self, data: Dict[str, Any]):
        """
        Print a formatted reward ticket.
        
        Expected data format:
        {
            "coupon_code": "123456",
            "reward_name": "Free Coffee",
            "date": "2024-05-20" (optional)
        }
        """
        coupon_code = data.get('coupon_code', 'UNKNOWN')
        reward_name = data.get('reward_name', 'Mystery Reward')
        date_str = data.get('date', time.strftime("%Y-%m-%d %H:%M"))
        
        self.logger.info(f"Printing reward ticket: {reward_name} ({coupon_code})")
        
        with self.lock:
            try:
                with serial.Serial(
                    port=self.port,
                    baudrate=self.baudrate,
                    parity=serial.PARITY_NONE,
                    stopbits=serial.STOPBITS_ONE,
                    bytesize=serial.EIGHTBITS,
                    timeout=1
                ) as ser:
                    # Initialize
                    ser.write(b'\x1B\x40')
                    time.sleep(0.1)
                    
                    # Formatting commands
                    align_center = b'\x1B\x61\x01'
                    align_left = b'\x1B\x61\x00'
                    double_height = b'\x1B\x21\x10'
                    double_width = b'\x1B\x21\x20'
                    normal = b'\x1B\x21\x00'
                    bold_on = b'\x1B\x45\x01'
                    bold_off = b'\x1B\x45\x00'
                    
                    # Header
                    ser.write(align_center)
                    ser.write(double_height + double_width + b'CONGRATULATIONS!\n')
                    ser.write(normal + b'\n')
                    
                    # Reward content
                    ser.write(bold_on + b'You earned a reward:\n')
                    ser.write(bold_off + b'\n')
                    
                    ser.write(double_height + reward_name.encode('utf-8', errors='ignore') + b'\n')
                    ser.write(normal + b'\n')
                    
                    # Code
                    ser.write(b'Code: ' + coupon_code.encode('utf-8') + b'\n')
                    ser.write(b'\n')
                    
                    # Footer
                    ser.write(b'Date: ' + date_str.encode('utf-8') + b'\n')
                    ser.write(b'Keep this ticket to redeem.\n')
                    ser.write(b'\n\n\n') # Feed
                    
            except Exception as e:
                self.logger.error(f"Failed to print reward ticket: {e}")

# Singleton instance
_printer_manager = None

def get_printer_manager():
    global _printer_manager
    if _printer_manager is None:
        _printer_manager = PrinterManager()
    return _printer_manager
