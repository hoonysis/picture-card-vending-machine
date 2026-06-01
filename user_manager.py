
import os
import hashlib
import json
import shutil
import unicodedata

class UserManager:
    # 시스템 계정만 보호한다. 일반 사용자(이관된 기존 12명 포함)는 모두 수정·삭제 가능.
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

    # ── 대문 사용자 관리(추가는 register_user 재사용, 아래는 수정·삭제) ──

    def _beta_folder(self, name):
        """이름 → 신규 사용자 폴더 절대경로 (register_user와 동일한 [:8] 해시 규칙)."""
        user_hash = hashlib.md5(name.encode('utf-8')).hexdigest()[:8]
        return os.path.join(self.base_dir, self.user_images_dir, f"beta_{user_hash}")

    def find_user_dir_by_name(self, name):
        """표시명으로 실제 폴더를 찾는다. 폴더가 [:8]·full-hash·레거시 등 어떤 규칙으로
        만들어졌든 .name 파일을 스캔해 매칭하므로 list_users와 동일한 기준으로 동작한다."""
        name = unicodedata.normalize('NFC', (name or '').strip())
        if not name:
            return None
        users_root = os.path.join(self.base_dir, self.user_images_dir)
        if not os.path.isdir(users_root):
            return None
        try:
            for entry in os.scandir(users_root):
                if not (entry.is_dir() and entry.name.startswith('beta_')):
                    continue
                name_file = os.path.join(entry.path, '.name')
                if not os.path.exists(name_file):
                    continue
                try:
                    with open(name_file, 'r', encoding='utf-8') as f:
                        real = unicodedata.normalize('NFC', f.read().strip())
                    if real == name:
                        return entry.path
                except Exception:
                    continue
        except Exception:
            return None
        return None

    def _is_managed(self, name):
        """관리(수정·삭제) 가능한 일반 사용자인지. 시스템 계정만 보호."""
        return bool(name) and name not in self.HIDDEN_USER_NAMES

    def rename_user(self, old_name, new_name):
        """표시명 변경. 폴더(beta_<해시>)도 새 해시로 옮기고 .name 파일을 갱신해
        기존 업로드 이미지·저장소가 유실되지 않게 한다. (True, None) 또는 (False, error)."""
        old_name = (old_name or '').strip()
        new_name = (new_name or '').strip()

        if not old_name or not new_name:
            return False, '이름이 비어 있습니다.'
        if old_name == new_name:
            return False, '이전 이름과 같습니다.'
        if not self._is_managed(old_name):
            return False, '보호된 사용자는 수정할 수 없습니다.'
        if not self._is_managed(new_name):
            return False, '사용할 수 없는 이름입니다.'

        old_dir = self.find_user_dir_by_name(old_name)
        if not old_dir:
            return False, '사용자 폴더를 찾을 수 없습니다.'
        if self.find_user_dir_by_name(new_name):
            return False, '이미 존재하는 이름입니다.'

        new_dir = self._beta_folder(new_name)
        if os.path.exists(new_dir):
            return False, '이미 존재하는 이름입니다.'

        try:
            os.rename(old_dir, new_dir)
            with open(os.path.join(new_dir, '.name'), 'w', encoding='utf-8') as f:
                f.write(new_name)
            return True, None
        except Exception as e:
            return False, str(e)

    def delete_user(self, name, backup_dest):
        """사용자 삭제. 삭제 전 폴더를 backup_dest로 통째 복사한 뒤 제거한다.
        backup_dest(타임스탬프 포함 경로)는 호출부에서 주입. (True, None) 또는 (False, error)."""
        name = (name or '').strip()
        if not self._is_managed(name):
            return False, '보호된 사용자는 삭제할 수 없습니다.'

        user_dir = self.find_user_dir_by_name(name)
        if not user_dir:
            return False, '사용자 폴더를 찾을 수 없습니다.'

        try:
            os.makedirs(os.path.dirname(backup_dest), exist_ok=True)
            shutil.copytree(user_dir, backup_dest)
            self._force_rmtree(user_dir)
            return True, None
        except Exception as e:
            return False, str(e)

    @staticmethod
    def _force_rmtree(path):
        """읽기전용 파일이 섞여 있어도 지워지도록 권한을 풀고 재시도하며 삭제."""
        import stat

        def on_error(func, p, exc_info):
            try:
                os.chmod(p, stat.S_IWRITE)
                func(p)
            except Exception:
                raise

        # Python 3.12+는 onexc, 이전은 onerror. 호환 위해 분기.
        try:
            shutil.rmtree(path, onexc=lambda func, p, exc: on_error(func, p, exc))
        except TypeError:
            shutil.rmtree(path, onerror=on_error)

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
