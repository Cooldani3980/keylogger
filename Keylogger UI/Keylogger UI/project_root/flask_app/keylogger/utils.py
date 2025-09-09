from cryptography.fernet import Fernet
from pathlib import Path

def decrypt_log(file_path, key):
    if not Path(file_path).exists():
        return []
    cipher = Fernet(key)
    lines = []
    with open(file_path, "rb") as f:
        for l in f:
            if l.strip():
                try:
                    decrypted = cipher.decrypt(l.strip())
                    lines.append(decrypted.decode())
                except:
                    continue
    return lines