
import logging
from printer_manager import get_printer_manager

# 設定日誌
logging.basicConfig(level=logging.INFO)

def test_image_print():
    print("Testing Image Print...")
    manager = get_printer_manager()
    
    # 測試用圖片 (隨機黑白圖片或簡單圖案)
    # 使用 placeholder 圖片服務，生成一個簡單的黑白圖片
    test_url = "https://placehold.co/384x384/black/white.png?text=TEST"
    
    print(f"Downloading and printing from: {test_url}")
    try:
        manager.print_image_from_url(test_url)
        print("Command sent. Did it print?")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_image_print()
