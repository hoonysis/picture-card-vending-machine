import http.server
import socketserver
import webbrowser
import os
import threading

# 앱 기본 설정
PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    # 단순 로그 표시 방지 원할 시 아래 주석 해제 (단, 오류 잡으려면 있는게 좋음)
    # def log_message(self, format, *args):
    #     pass

def start_server():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print("=========================================================")
        print(f"✅ Vocab Tracker 임시 로컬 서버가 시작되었습니다!")
        print(f"👉 브라우저 주소: http://localhost:{PORT}")
        print("=========================================================")
        print("서버를 종료하려면 이 창을 닫거나 Ctrl+C를 누르세요.\n")
        httpd.serve_forever()

if __name__ == "__main__":
    # 서버는 백그라운드 스레드에서 돌리고
    server_thread = threading.Thread(target=start_server)
    server_thread.daemon = True
    server_thread.start()

    # 즉시 브라우저 팝업
    webbrowser.open(f'http://localhost:{PORT}/index.html')

    # 메인 스레드는 계속 대기 (Ctrl+C 로 종료 가능)
    try:
        server_thread.join()
    except KeyboardInterrupt:
        print("\n서버를 종료합니다. 안녕히 가세요!")
