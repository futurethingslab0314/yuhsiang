
import serial
import time
import requests
from PIL import Image, ImageOps, ImageEnhance
from io import BytesIO

def test_print_image(url):
    print(f"Downloading image from: {url}")
    try:
        response = requests.get(url, timeout=10)
        print(f"Download status: {response.status_code}")
        
        img = Image.open(BytesIO(response.content))
        print(f"Original image size: {img.size}")
        
        # Resize
        MAX_WIDTH = 384
        w_percent = (MAX_WIDTH / float(img.size[0]))
        h_size = int((float(img.size[1]) * float(w_percent)))
        img = img.resize((MAX_WIDTH, h_size), Image.Resampling.LANCZOS)
        print(f"Resized to: {img.size}")
        
        # Process
        img = img.convert('L')
        img = ImageEnhance.Brightness(img).enhance(1.2)
        img = ImageEnhance.Contrast(img).enhance(3.0)
        img = ImageEnhance.Sharpness(img).enhance(3.0)
        img = ImageOps.invert(img.convert('L')).convert('1')
        
        # Print
        port = '/dev/serial0'
        baudrate = 19200
        
        print(f"Printing to {port} at {baudrate}...")
        try:
            ser = serial.Serial(port, baudrate, timeout=1)
            
            # Init
            ser.write(b'\x1B\x40')
            time.sleep(0.1)
            ser.write(b'\x1B\x37\x64\xFA\x05') # High density
            
            # Print Command
            width_bytes = int(MAX_WIDTH / 8)
            height_pixels = img.height
            
            header = b'\x1D\x76\x30\x00'
            xL = width_bytes % 256
            xH = width_bytes // 256
            yL = height_pixels % 256
            yH = height_pixels // 256
            
            cmd = header + bytes([xL, xH, yL, yH])
            ser.write(cmd)
            
            # Get image data
            data = img.tobytes()
            
            # Split into small chunks to prevent buffer overflow at 19200 baud
            # 19200 baud ~= 1920 bytes/sec. 
            # Safe chunk size: 32 bytes (takes ~0.016s to transmit, we sleep longer to be safe)
            CHUNK_SIZE = 32
            
            # Print total size for reference
            total_bytes = len(data)
            print(f"Total image bytes: {total_bytes}")
            
            for i in range(0, len(data), CHUNK_SIZE):
                chunk = data[i:i+CHUNK_SIZE]
                ser.write(chunk)
                
                # Dynamic delay: wait slightly longer than transmission time
                # + extra buffer for printer processing
                time.sleep(0.05) 
                
                # Progress indicator
                percent = (i + len(chunk)) / total_bytes * 100
                print(f"Printing... {percent:.1f}%", end='\r')

            
            print("\nFeeding paper...")
            ser.write(b'\n\n\n')
            ser.close()
            print("Done!")
            
        except Exception as e:
            print(f"Serial Error: {e}")

    except Exception as e:
        print(f"Image Processing Error: {e}")

if __name__ == "__main__":
    # Test with a simple stable image first
    test_url = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
    test_print_image(test_url)
