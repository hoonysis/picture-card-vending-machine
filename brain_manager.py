import os
import shutil
import datetime
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import threading

# --- Configurations ---
BRAIN_PATH = os.path.expanduser("~/.gemini/antigravity")
WINDOW_TITLE = "🤖 Antigravity Brain Manager"
WINDOW_SIZE = "400x250"

class BrainManagerApp:
    def __init__(self, root):
        self.root = root
        self.root.title(WINDOW_TITLE)
        self.root.geometry(WINDOW_SIZE)
        self.root.resizable(False, False)
        
        # Style
        style = ttk.Style()
        style.configure("TButton", font=("Malgun Gothic", 12), padding=10)
        style.configure("TLabel", font=("Malgun Gothic", 10))

        # Header
        header = ttk.Label(root, text="안티그레비티 두뇌 관리자", font=("Malgun Gothic", 16, "bold"))
        header.pack(pady=20)

        # Status Label
        self.status_var = tk.StringVar()
        self.status_var.set(f"타겟 경로: ...{BRAIN_PATH[-30:]}")
        status_label = ttk.Label(root, textvariable=self.status_var, foreground="gray")
        status_label.pack(pady=(0, 20))

        # Buttons
        btn_frame = ttk.Frame(root)
        btn_frame.pack(fill="x", padx=40)

        self.btn_backup = ttk.Button(btn_frame, text="🧠 두뇌 백업하기 (Save)", command=self.start_backup)
        self.btn_backup.pack(fill="x", pady=5)

        self.btn_restore = ttk.Button(btn_frame, text="♻️ 두뇌 복원하기 (Load)", command=self.start_restore)
        self.btn_restore.pack(fill="x", pady=5)

        # check path existence
        if not os.path.exists(BRAIN_PATH):
            messagebox.showwarning("경로 확인 필요", f"안티그레비티 폴더를 찾을 수 없습니다.\n({BRAIN_PATH})")
            self.status_var.set("❌ 경로를 찾을 수 없음")
            self.btn_backup.config(state="disabled")

    def start_backup(self):
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        default_name = f"Antigravity_Brain_{timestamp}.zip"
        
        target_path = filedialog.asksaveasfilename(
            title="백업 파일 저장 위치 선택",
            defaultextension=".zip",
            initialfile=default_name,
            filetypes=[("Zip Files", "*.zip")]
        )
        
        if target_path:
            self.run_async(self.do_backup, target_path)

    def do_backup(self, target_zip):
        try:
            self.update_status("📦 백업 압축 중...")
            # make_archive expects base_name (without .zip) and root_dir
            base_name = target_zip.replace('.zip', '')
            shutil.make_archive(base_name, 'zip', BRAIN_PATH)
            
            messagebox.showinfo("성공", f"백업이 완료되었습니다!\n\n저장위치:\n{target_zip}")
            self.update_status("✅ 백업 완료")
        except Exception as e:
            messagebox.showerror("오류", f"백업 중 오류 발생:\n{str(e)}")
            self.update_status("❌ 백업 실패")

    def start_restore(self):
        source_zip = filedialog.askopenfilename(
            title="복원할 백업 파일 선택",
            filetypes=[("Zip Files", "*.zip")]
        )
        
        if source_zip:
            if messagebox.askyesno("경고", "⚠️ 현재 두뇌 상태를 덮어씁니다!\n\n복원하기 전에 현재 상태를 안전하게 임시 백업하시겠습니까?\n(추천: 예)"):
                safe_backup = True
            else:
                safe_backup = False
                if not messagebox.askyesno("최종 확인", "정말 임시 백업 없이 덮어씌우시겠습니까?\n복구할 수 없습니다!"):
                    return

            self.run_async(self.do_restore, source_zip, safe_backup)

    def do_restore(self, source_zip, safe_backup):
        try:
            self.update_status("♻️ 복원 작업 시작...")
            
            # 1. Safe Backup (Rename current)
            if os.path.exists(BRAIN_PATH):
                timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                safety_path = f"{BRAIN_PATH}_backup_{timestamp}"
                
                if safe_backup:
                    self.update_status("🛡️ 현재 상태 대피 중...")
                    shutil.move(BRAIN_PATH, safety_path)
                else:
                    # Dangerous: Delete current
                    shutil.rmtree(BRAIN_PATH)
            
            # 2. Unzip
            self.update_status("📂 압축 해제 중...")
            shutil.unpack_archive(source_zip, BRAIN_PATH)
            
            msg = "두뇌 복원이 완료되었습니다!"
            if safe_backup:
                msg += f"\n\n(참고: 이전 상태는 '{os.path.basename(safety_path)}' 폴더에 보관됨)"
            
            messagebox.showinfo("성공", msg)
            self.update_status("✅ 복원 완료")
            
        except Exception as e:
            messagebox.showerror("오류", f"복원 중 치명적 오류 발생:\n{str(e)}\n\n(폴더 상태를 수동으로 확인해주세요.)")
            self.update_status("❌ 복원 실패")

    def run_async(self, func, *args):
        self.set_buttons_state("disabled")
        threading.Thread(target=self._wrapper, args=(func, *args), daemon=True).start()

    def _wrapper(self, func, *args):
        func(*args)
        self.set_buttons_state("normal")

    def set_buttons_state(self, state):
        self.root.after(0, lambda: self.btn_backup.config(state=state))
        self.root.after(0, lambda: self.btn_restore.config(state=state))

    def update_status(self, text):
        self.root.after(0, lambda: self.status_var.set(text))

if __name__ == "__main__":
    root = tk.Tk()
    app = BrainManagerApp(root)
    root.mainloop()
