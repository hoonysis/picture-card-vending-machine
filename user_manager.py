
import os
import hashlib
import json

class UserManager:
    HIDDEN_USER_NAMES = {
        'guest',
        'hoon-admin',
        'beta_direct_art_test',
        'beta_regression_check',
    }

    def __init__(self, base_dir, admin_pass):
        self.base_dir = base_dir
        self.admin_pass = admin_pass
        self.user_images_dir = 'user_images' # Shared constant, could be passed in

    def check_auth(self, password):
        return password == self.admin_pass

    def get_user_dir(self, user_id, create=True):
        # 1. [Legacy] Check 'user_images' (Admins, Pre-existing)
        legacy_safe_id = "".join([c for c in user_id if c.isalnum() or c in ('-', '_')])
        if not legacy_safe_id: legacy_safe_id = "guest"
        
        legacy_path = os.path.join(self.base_dir, self.user_images_dir, legacy_safe_id)
        if os.path.exists(legacy_path):
            return legacy_path
        
        # 2. [Legacy Beta] PythonAnywhere may already have folders that use
        # the full MD5 hash. Keep reading those folders after migration.
        full_hash_path = os.path.join(
            self.base_dir,
            self.user_images_dir,
            f"beta_{hashlib.md5(user_id.encode('utf-8')).hexdigest()}"
        )
        if os.path.exists(full_hash_path):
            return full_hash_path

        # 3. [Consolidation] Use 'user_images' for Beta too, but with 'beta_' prefix + Hash
        folder_name = f"beta_{hashlib.md5(user_id.encode('utf-8')).hexdigest()[:8]}"
        beta_path = os.path.join(self.base_dir, self.user_images_dir, folder_name)
        
        if not os.path.exists(beta_path):
            if not create:
                return None
            os.makedirs(beta_path, exist_ok=True)
            # Save the Real Name to identify this hash folder later
            try:
                with open(os.path.join(beta_path, '.name'), 'w', encoding='utf-8') as f:
                    f.write(user_id)
            except: pass
            
        return beta_path

    def register_user(self, name):
        if not name: return None, "Name required"
        
        # Generate User ID
        user_hash = hashlib.md5(name.encode('utf-8')).hexdigest()[:8]
        user_id = f"beta_{user_hash}"
        
        user_dir = os.path.join(self.base_dir, self.user_images_dir, user_id)
        
        if not os.path.exists(user_dir):
            os.makedirs(user_dir)
            
        # Write .name file (Source of Truth for Display Name)
        name_file = os.path.join(user_dir, '.name')
        with open(name_file, 'w', encoding='utf-8') as f:
            f.write(name)
            
        return user_id, None

    def list_users(self):
        # Only list Beta Users (folders starting with 'beta_') from user_images
        users_root = os.path.join(self.base_dir, self.user_images_dir)
        
        if not os.path.exists(users_root):
            return []
        
        users = []
        try:
            for entry in os.scandir(users_root):
                 # Skip hidden files
                if entry.name.startswith('.'): continue
                
                if entry.is_dir():
                    # Check for Beta Marker
                    if entry.name.startswith('beta_'):
                        # Read real name from .name file
                        name_file = os.path.join(entry.path, '.name')
                        if os.path.exists(name_file):
                            try:
                                with open(name_file, 'r', encoding='utf-8') as f:
                                    real_name = f.read().strip()
                                    if real_name and real_name not in self.HIDDEN_USER_NAMES:
                                        users.append(real_name)
                            except: pass
        except Exception as e:
            print(f"Error listing users: {e}")
            return []
            
        return sorted(users)

    def load_presets(self, user_id):
        if user_id in self.HIDDEN_USER_NAMES:
            return []

        user_dir = self.get_user_dir(user_id, create=False)
        path = os.path.join(user_dir, 'presets.json') if user_dir else None
        
        if path and os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except: return []

        # [Fallback] Check legacy global file (from previous version)
        global_path = os.path.join(self.base_dir, 'user_presets.json')
        if os.path.exists(global_path):
            try:
                with open(global_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # If it was a dict {user_id: [presets]}
                if isinstance(data, dict):
                    user_data = data.get(user_id)
                    if user_data:
                        # Auto-Migrate to personal file
                        self.save_presets(user_id, user_data)
                        return user_data
            except: pass
                
        return []

    def save_presets(self, user_id, data):
        user_dir = self.get_user_dir(user_id)
        if not os.path.exists(user_dir): os.makedirs(user_dir, exist_ok=True)
        
        path = os.path.join(user_dir, 'presets.json')
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=4)
            return True
        except: return False
