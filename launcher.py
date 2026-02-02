import tkinter as tk
from tkinter import ttk, messagebox
import subprocess
import webbrowser
import socket
import os
import sys
import traceback

# Constants
SERVER_SCRIPT = "server.py"
PORT = 5000
HOST = "localhost"
S_URL = f"http://{HOST}:{PORT}"

# Redirect errors to log file
sys.stderr = open('launcher_error.log', 'a')

class VendingLauncher:
    def __init__(self, root):
        self.root = root
        self.root.title("한그루 그림 자판기 런처")
        self.root.geometry("350x550")
        self.root.resizable(False, False)
        
        # Style
        style = ttk.Style()
        style.configure("TButton", font=("Malgun Gothic", 11), padding=10)
        style.configure("Header.TLabel", font=("Malgun Gothic", 14, "bold"))
        style.configure("Status.TLabel", font=("Malgun Gothic", 10))
        style.configure("Help.TLabel", font=("Malgun Gothic", 11), foreground="black")

        # UI Components
        main_frame = ttk.Frame(root, padding=20)
        main_frame.pack(fill="both", expand=True)

        # Header
        header = ttk.Label(main_frame, text="🗣️ 그림 자판기 통합 관리", style="Header.TLabel")
        header.pack(pady=(0, 20))

        # Status
        self.status_var = tk.StringVar(value="상태 확인 중...")
        self.status_label = ttk.Label(main_frame, textvariable=self.status_var, style="Status.TLabel")
        self.status_label.pack(pady=(0, 20))

        # Buttons
        self.btn_main = ttk.Button(main_frame, text="🖼️ 자판기 실행 (Main)", command=lambda: self.launch_action("main"), width=25)
        self.btn_main.pack(pady=5)

        self.btn_admin = ttk.Button(main_frame, text="🔧 관리자 실행 (Admin)", command=lambda: self.launch_action("admin"), width=25)
        self.btn_admin.pack(pady=5)
        
        ttk.Separator(main_frame, orient="horizontal").pack(fill="x", pady=20)

        self.btn_stop = ttk.Button(main_frame, text="🛑 서버 종료 (Stop)", command=self.stop_server, width=25)
        self.btn_stop.pack(pady=5)

        # Help Text
        help_text = (
            "━━━━━━━━ 안내 ━━━━━━━━\n\n"
            "1. 다 쓰신 후에는 꼭 위 빨간색\n"
            "   [서버 종료] 버튼을 눌러주세요.\n\n"
            "2. 인터넷 창(브라우저)은\n"
            "   직접 X를 눌러서 닫으면 됩니다."
        )
        help_label = ttk.Label(main_frame, text=help_text, style="Help.TLabel", justify="center")
        help_label.pack(pady=(20, 0))

        # Initial Check
        self.is_busy = False # Prevent multi-clicks
        self.check_status()
        
        # Periodic Status Update (Every 3 seconds)
        self.schedule_periodic_check()

        # Handle Window Close Exclusively
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)

    def on_close(self):
        # Prevent closing if server is running
        if self.is_port_open():
            messagebox.showwarning("주의", "⚠️ 서버가 아직 실행 중입니다!\n\n먼저 [서버 종료] 버튼을 눌러주세요.\n서버를 끄지 않으면 런처를 닫을 수 없습니다.")
            return
        self.root.destroy()

    def is_port_open(self):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.5)
                return s.connect_ex((HOST, PORT)) == 0
        except:
            return False

    def check_status(self):
        # Lightweight check
        if self.is_port_open():
            self.status_var.set("🟢 서버 실행 중 (ON)")
            self.status_label.configure(foreground="green")
            self.btn_stop.state(['!disabled'])
        else:
            self.status_var.set("⚫ 서버 정지됨 (OFF)")
            self.status_label.configure(foreground="red")
            self.btn_stop.state(['disabled'])

    def schedule_periodic_check(self):
        if not self.is_busy:
            self.check_status()
        self.root.after(3000, self.schedule_periodic_check)

    def set_busy(self, busy=True, msg="처리 중..."):
        self.is_busy = busy
        if busy:
            self.status_var.set(msg)
            self.status_label.configure(foreground="orange")
            self.btn_main.state(['disabled'])
            self.btn_admin.state(['disabled'])
            self.btn_stop.state(['disabled'])
        else:
            self.btn_main.state(['!disabled'])
            self.btn_admin.state(['!disabled'])
            self.check_status() # Restore status text

    def launch_action(self, target):
        if self.is_busy: return
        
        if self.is_port_open():
            # Server already running, just open browser
            self.open_browser(target)
        else:
            # Check if server.py exists first
            if not os.path.exists(SERVER_SCRIPT):
                messagebox.showerror("오류", f"'{SERVER_SCRIPT}' 파일이 없습니다.")
                return

            self.set_busy(True, "🟡 서버 시작 중...")
            
            try:
                # Start Server process detached
                subprocess.Popen(
                    ["python", SERVER_SCRIPT], 
                    creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0,
                    cwd=os.path.dirname(os.path.abspath(__file__))
                )
                
                # Start Polling
                self.poll_server_start(target, 0)
            except Exception as e:
                messagebox.showerror("오류", f"서버 실행 실패: {e}")
                self.set_busy(False)

    def poll_server_start(self, target, attempts):
        if self.is_port_open():
            # Success!
            self.set_busy(False)
            self.open_browser(target)
        elif attempts > 20: # 10 seconds timeout (20 * 500ms)
            # Timeout
            self.set_busy(False)
            messagebox.showerror("오류", "서버가 시작되지 않았습니다. (시간 초과)")
        else:
            # Keep waiting
            self.root.after(500, lambda: self.poll_server_start(target, attempts + 1))

    def open_browser(self, target):
        url = f"{S_URL}/?v=launcher" if target == "main" else f"{S_URL}/admin"
        webbrowser.open(url)

    def stop_server(self):
        if self.is_busy: return
        self.set_busy(True, "🔴 서버 종료 중...")

        # Run stop command asynchronously-ish (using 'start' or just simple run)
        # subprocess.run is blocking, but taskkill is fast. We use 'after' to keep UI fluid.
        self.root.after(100, self._perform_stop)
        
    def _perform_stop(self):
        try:
            # Force kill port 5000 users AND child processes (/T)
            cmd = f"for /f \"tokens=5\" %a in ('netstat -aon ^| find \":{PORT}\" ^| find \"LISTENING\"') do taskkill /f /t /pid %a"
            subprocess.run(cmd, shell=True, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        except Exception as e:
            messagebox.showerror("오류", f"종료 실패: {e}")
        
        # Give it a moment to release port then update UI
        self.root.after(2000, lambda: self.set_busy(False))

if __name__ == "__main__":
    try:
        root = tk.Tk()
        
        # Center Window
        ws = root.winfo_screenwidth()
        hs = root.winfo_screenheight()
        w = 350
        h = 320
        x = (ws/2) - (w/2)
        y = (hs/2) - (h/2)
        root.geometry('%dx%d+%d+%d' % (w, h, x, y))
        
        app = VendingLauncher(root)
        root.mainloop()
    except Exception as e:
        # Fallback error reporting
        with open('launcher_fatal.txt', 'w') as f:
            f.write(traceback.format_exc())
        messagebox.showerror("치명적 오류", f"런처 실행 중 오류 발생:\n{e}")
