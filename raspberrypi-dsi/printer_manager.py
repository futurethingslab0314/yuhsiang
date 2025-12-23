
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
                    # Initialize
                    ser.write(b'\x1B\x40') 
                    time.sleep(0.1)
                    
                    # --- Set High Darkness ---
                    # ESC 7 n1 n2 n3
                    # Max heating dots=7, Heating time=200, Heating interval=2
                    ser.write(b'\x1B\x37\x07\xC8\x02')
                    time.sleep(0.1)
                    # -------------------------
                    
                    # Encode and print
                    if isinstance(text, str):
                        data = text.encode('utf-8', errors='ignore')
                    else:
                        data = text
                        
                    ser.write(data)
                    ser.write(b'\n')
                    
            except Exception as e:
                self.logger.error(f"Failed to print text: {e}")

    
    def print_image_from_url(self, url: str):
        """
        Download and print an image from a URL.
        Resizes and converts to 1-bit black and white for thermal printing.
        """
        self.logger.info(f"Downloading image from {url}...")
        try:
            import requests
            from PIL import Image
            from io import BytesIO
            
            response = requests.get(url, timeout=10)
            if response.status_code != 200:
                self.logger.error(f"Failed to download image: status {response.status_code}")
                return

            # Open image
            img = Image.open(BytesIO(response.content))
            
            # Reset printer
            self._write_bytes(b'\x1B\x40')
            time.sleep(0.1)

            # --- Set High Darkness for Image (MAX settings) ---
            # ESC 7 n1 n2 n3
            # n1 (Max heating dots): 減少到 64 (0x40) 甚至更低，讓電流更集中，印得更黑但更慢
            # n2 (Heating time): 增加到 250 (0xFA)，最大 255
            # n3 (Heating interval): 增加到 20 (0x14)，讓電源有時間回充
            self._write_bytes(b'\x1B\x37\x40\xFA\x14') 
            time.sleep(0.1)
            # -----------------------------------
            
            # --- Image Processing ---
            # 1. Resize height to keep aspect ratio, max width 384
            MAX_WIDTH = 384 
            w_percent = (MAX_WIDTH / float(img.size[0]))
            h_size = int((float(img.size[1]) * float(w_percent)))
            img = img.resize((MAX_WIDTH, h_size), Image.Resampling.LANCZOS)
            
            # 2. Convert to Grayscale first
            img = img.convert('L')
            
            # 3. Enhance Contrast & Sharpness
            from PIL import ImageEnhance
            
            # Increase Brightness slightly first (prevent dark blobs)
            enhancer = ImageEnhance.Brightness(img)
            img = enhancer.enhance(1.2)

            # Increase contrast significantly
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(3.0)  # Increase contrast by 3x (was 2x)
            
            # Increase sharpness
            enhancer = ImageEnhance.Sharpness(img)
            img = enhancer.enhance(3.0) # Increase sharpness by 3x (was 2x)
            
            # 4. Convert to Black and White (1-bit) with Floyd-Steinberg dithering
            # Using custom logic or standard convert with dithering
            img = img.convert('1', dither=Image.Dither.FLOYDSTEINBERG)
            # Alternatively, try simple threshold if dithering is too messy
            # fn = lambda x : 255 if x > 128 else 0
            # img = img.point(fn, mode='1')

            # Invert if necessary? Thermal printers print black dots. 
            # In PIL '1' mode: 0 is black, 1 is white usually? No, actually:
            # 0 is black, 255 is white in L mode.
            # In '1' mode, usually white is 255 (1) and black is 0.
            # However, for printer command, 1 bit = print dot (black).
            # So we typically need to check: if pixel is BLACK (0), send 1.
            
            # Let's invert the image so that Black pixels become White (1) 
            # and we send 1s to printer to heat up.
            # WAIT: GS v 0 expects 1 to print a dot (black).
            # If PIL image has black as 0, we need to invert it.
            from PIL import ImageOps
            # In 'L' mode, black is 0. In '1' mode, black is 0.
            # We want black parts of image to be 1 in our data stream.
            # So we invert: Black(0) -> 1, White(1) -> 0.
            img = ImageOps.invert(img.convert('L')).convert('1')
            
            # --- Printing (Bit Image Mode - GS v 0) ---
            # GS v 0 m xL xH yL yH d1...dk
            # m=0 (normal), xL,xH = width in bytes, yL,yH = height in dots
            
            width_bytes = int(MAX_WIDTH / 8)
            height_pixels = img.height
            
            # Header command
            # \x1D\x76\x30 is GS v 0
            # m = 0
            header = b'\x1D\x76\x30\x00' 
            
            # xL, xH
            xL = width_bytes % 256
            xH = width_bytes // 256
            
            # yL, yH
            yL = height_pixels % 256
            yH = height_pixels // 256
            
            cmd = header + bytes([xL, xH, yL, yH])
            
            # Get data
            data = img.tobytes()
            
            with self.lock:
                with serial.Serial(self.port, self.baudrate, timeout=1) as ser:
                    # Send command header
                    ser.write(cmd)
                    # Send image data
                    # Break into chunks to avoid buffer overflow if needed, but GS v 0 usually handles stream
                    # Let's write in chunks of 1KB just in case
                    CHUNK_SIZE = 1024
                    for i in range(0, len(data), CHUNK_SIZE):
                        ser.write(data[i:i+CHUNK_SIZE])
                        # 增加延遲，讓印表機有時間「慢慢印」
                        time.sleep(0.05) # 從 0.01 增加到 0.05
                    
                    # Feed paper after image
                    ser.write(b'\n\n\n')
            
            self.logger.info("Image print command sent.")

        except ImportError:
             self.logger.error("Pillow or requests not installed. Cannot print image.")
        except Exception as e:
            self.logger.error(f"Failed to print image: {e}")

    def _write_bytes(self, data: bytes):
        """Helper to safely write bytes"""
        with self.lock:
            try:
                with serial.Serial(self.port, self.baudrate, timeout=1) as ser:
                    ser.write(data)
            except Exception as e:
                self.logger.error(f"Serial write error: {e}")

    def print_reward_ticket(self, data: Dict[str, Any]):
        """
        Print a formatted reward ticket.
        If 'imageUrl' is present, print that instead of text ticket.
        """
        # Check if we have an image URL
        image_url = data.get('imageUrl') or data.get('image_url')
        if image_url:
            self.print_image_from_url(image_url)
            # Maybe print a small footer text afterwards?
            # self.print_text("Date: " + data.get('date', ''))
            return

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
                    
                    # --- Set High Darkness ---
                    ser.write(b'\x1B\x37\x07\xC8\x02')
                    time.sleep(0.1)
                    # -------------------------
                    
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
