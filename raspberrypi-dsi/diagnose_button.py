#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Button Diagnosis Script
Monitors common GPIO pins to detect button presses.
"""

import pigpio
import time
import sys
import signal

# Common GPIO pins to monitor
# 18: Old config
# 23: New config (WakeUpMap)
# 17, 27, 22, 24, 25: Other common GPIOs
PINS_TO_MONITOR = [18, 23, 17, 27, 22, 24, 25, 16]

def signal_handler(sig, frame):
    print("\nExiting...")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

def callback(gpio, level, tick):
    timestamp = time.strftime("%H:%M:%S", time.localtime())
    state = "PRESSED (Low)" if level == 0 else "RELEASED (High)"
    print(f"[{timestamp}] Activity detected on GPIO {gpio}: {state}")

def main():
    print("Initializing pigpio...")
    pi = pigpio.pi()
    
    if not pi.connected:
        print("ERROR: Could not connect to pigpiod.")
        print("Please make sure pigpiod is running:")
        print("  sudo pigpiod")
        return

    print("\n=== Button Diagnosis Tool ===")
    print(f"Monitoring GPIO pins: {', '.join(map(str, PINS_TO_MONITOR))}")
    print("Press Ctrl+C to exit.\n")
    print("Current State:")
    
    # Configure pins and read initial state
    for pin in PINS_TO_MONITOR:
        try:
            # Set as Input
            pi.set_mode(pin, pigpio.INPUT)
            # Enable internal Pull-Up (assuming button connects to Ground)
            pi.set_pull_up_down(pin, pigpio.PUD_UP)
            
            # Read current level
            level = pi.read(pin)
            state = "High (Released?)" if level == 1 else "Low (Pressed?)"
            print(f"  GPIO {pin}: {state}")
            
            # Add callback for both edges
            pi.callback(pin, pigpio.EITHER_EDGE, callback)
            
        except Exception as e:
            print(f"  GPIO {pin}: Error setting up ({e})")

    print("\nWaiting for button presses...")
    print("Try pressing your button now. If you see output, note which GPIO it triggers.")
    
    while True:
        time.sleep(1)

if __name__ == "__main__":
    main()
