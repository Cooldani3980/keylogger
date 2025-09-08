import json, os, uuid
from werkzeug.security import generate_password_hash, check_password_hash

USERS_FILE = "users.json"
COMPUTERS_FILE = "computers.json"
KEYWORDS_FILE = "keywords.json"

def load_json(filename, default_value):
    if not os.path.exists(filename) or os.stat(filename).st_size == 0:
        return default_value
    with open(filename, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return default_value

def save_json(filename, data):
    with open(filename, "w") as f:
        json.dump(data, f, indent=2)

class UserService:
    def __init__(self):
        self.users_file = USERS_FILE

    def load_users(self):
        return load_json(self.users_file, [])

    def save_users(self, data):
        save_json(self.users_file, data)

    def create_user(self, username, password):
        users = self.load_users()
        if any(u["username"] == username for u in users):
            return False
        users.append({"username": username, "password": generate_password_hash(password)})
        self.save_users(users)
        return True

    def validate_user(self, username, password):
        users = self.load_users()
        for u in users:
            if u["username"] == username:
                return check_password_hash(u["password"], password)
        return False

class ComputersService:
    def __init__(self):
        self.computers_file = COMPUTERS_FILE

    def load_computers(self):
        # We now return a dictionary for easy access
        computers_list = load_json(self.computers_file, [])
        return {c["id"]: c for c in computers_list}

    def save_computers(self, data):
        # We save a list for cleaner file structure
        computers_list = list(data.values())
        save_json(self.computers_file, computers_list)

    def add_computer(self, name):
        computers = self.load_computers()
        comp_id = str(uuid.uuid4())
        computers[comp_id] = {"id": comp_id, "name": name, "keystrokes": [], "last_connected": None}
        self.save_computers(computers)
        return comp_id

    def delete_computer(self, comp_id):
        computers = self.load_computers()
        if comp_id in computers:
            del computers[comp_id]
            self.save_computers(computers)

    def rename_computer(self, comp_id, new_name):
        computers = self.load_computers()
        if comp_id in computers:
            computers[comp_id]["name"] = new_name
            self.save_computers(computers)
            return True
        return False

class KeywordsService:
    def __init__(self):
        self.keywords_file = KEYWORDS_FILE

    def load_keywords(self):
        return load_json(self.keywords_file, [])

    def save_keywords(self, data):
        save_json(self.keywords_file, data)

    def add_keyword(self, keyword):
        keywords = self.load_keywords()
        if keyword not in keywords:
            keywords.append(keyword)
            self.save_keywords(keywords)

    def delete_keyword(self, keyword):
        keywords = self.load_keywords()
        keywords = [k for k in keywords if k != keyword]
        self.save_keywords(keywords)

user_service = UserService()
computers_service = ComputersService()
keywords_service = KeywordsService()