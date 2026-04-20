from flask import Flask
import os

# ── 설정 ──
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEPLOYMENT_VERSION = "VER_2026_03_29_MODULAR"

# ── 환경변수 로드 (.env 파일 있으면 읽음, 없으면 systemd/셸 env 사용) ──
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BASE_DIR, '.env'))
except ImportError:
    pass

# ── 매니저 초기화 ──
from data_manager import DataManager
from file_manager import FileManager
from user_manager import UserManager
from sync_manager import SyncManager

ADMIN_PASS = os.environ.get('ADMIN_PIN', '')
if not ADMIN_PASS:
    raise RuntimeError("ADMIN_PIN 환경변수 미설정. .env 파일 또는 systemd EnvironmentFile 확인.")
CREDENTIALS_PATH = os.path.join(BASE_DIR, 'credentials.json')
SHEET_URL = 'https://docs.google.com/spreadsheets/d/114C5f1aowSR6TVG4OtY-RwmvCgbu3k-Gz81GndxPKV8/edit'

data_manager = DataManager(BASE_DIR)
file_manager = FileManager(BASE_DIR, data_manager)
user_manager = UserManager(BASE_DIR, ADMIN_PASS)
sync_manager = SyncManager(CREDENTIALS_PATH, SHEET_URL)

# ── Flask 앱 ──
app = Flask(__name__, static_folder=None)
app.secret_key = os.environ.get('SECRET_KEY', '')
if not app.secret_key:
    raise RuntimeError("SECRET_KEY 환경변수 미설정. .env 파일 또는 systemd EnvironmentFile 확인.")
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

# 매니저를 app.config에 등록 (Blueprint에서 current_app.config로 접근)
app.config['data_manager'] = data_manager
app.config['file_manager'] = file_manager
app.config['user_manager'] = user_manager
app.config['sync_manager'] = sync_manager
app.config['BASE_DIR'] = BASE_DIR

# ── Blueprint 등록 ──
from routes.auth import auth_bp
from routes.static import static_bp
from routes.cards import cards_bp
from routes.upload import upload_bp
from routes.user import user_bp
from routes.admin import admin_bp

app.register_blueprint(auth_bp)
app.register_blueprint(static_bp)
app.register_blueprint(cards_bp)
app.register_blueprint(upload_bp)
app.register_blueprint(user_bp)
app.register_blueprint(admin_bp)

print(f"\n{'='*40}\n STARTING SERVER: {DEPLOYMENT_VERSION}\n BASE_DIR: {BASE_DIR}\n{'='*40}\n")

if __name__ == '__main__':
    app.run(debug=True, port=5000)
