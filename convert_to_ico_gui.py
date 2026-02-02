import tkinter as tk
from tkinter import filedialog, messagebox
from PIL import Image
import os

def convert_to_ico(input_path):
    try:
        if not input_path:
            return
            
        img = Image.open(input_path)
        output_path = os.path.splitext(input_path)[0] + ".ico"
        icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
        
        img.save(output_path, format='ICO', sizes=icon_sizes)
        messagebox.showinfo("성공", f"변환 완료!\n{output_path}")
        label_status.config(text=f"생성됨: {os.path.basename(output_path)}")
        
    except Exception as e:
        messagebox.showerror("오류", f"실패했습니다: {e}")

def select_file():
    file_path = filedialog.askopenfilename(
        title="이미지 선택",
        filetypes=[("Image files", "*.png;*.jpg;*.jpeg;*.webp")]
    )
    if file_path:
        label_path.config(text=file_path)
        convert_to_ico(file_path)

# GUI Setup
root = tk.Tk()
root.title("아이콘 변환기 🖼️ -> 📁")
root.geometry("300x150")

btn = tk.Button(root, text="이미지 파일 선택 (클릭)", command=select_file, height=2, bg="#e1f5fe")
btn.pack(pady=20, fill='x', padx=20)

label_path = tk.Label(root, text="파일을 선택하면 자동으로 변환됩니다.", fg="gray")
label_path.pack()

label_status = tk.Label(root, text="", fg="blue", font=("bold", 10))
label_status.pack(pady=5)

root.mainloop()
