# 🤖 AI & 개발자를 위한 프로젝트 가이드 (Universal Template)

## 0. 이 문서의 유지보수 원칙 (Meta-Rule)
*   **Single Source of Truth**: 이 파일은 프로젝트의 **'일기장(History)'이 아니라 '헌법(Rules)'**입니다.
*   **No Logs**: 작업 내역이나 날짜별 히스토리는 절대 여기에 기록하지 마세요. (별도 `chat/` 폴더나 커밋 메시지 활용)
*   **갱신(Update) 중심**: 규칙이 바뀌면 밑에 추가하지 말고, **해당 조항을 직접 수정**하여 항상 '현재 상태'를 정의하세요.
*   **참조 우선**: 작업을 시작하기 전 무조건 이 파일을 먼저 읽어, 프로젝트의 룰(Rule)을 파악해야 합니다.

## 1. 배포 및 운영 환경 (Project Context)
**[프로젝트의 핵심 환경을 여기에 정의하세요]**
*   **서버 환경**: (예: Vercel, AWS, PythonAnywhere...)
*   **배포 방식**: (예: GitHub Push 자동 배포, FTP 수동 업로드...)
*   **주의**: AI가 임의로 배포 명령을 내리지 않도록 제약을 거세요.

## 2. 핵심 개발 원칙 (Vibe Coding 6대 원칙)
이 프로젝트의 코드 품질과 지속 가능성을 위해 다음 6가지 철학을 강제합니다.

1.  **바퀴를 재발명하지 마라 (Don't Reinvent the Wheel)**
    *   복잡한 UI나 로직은 직접 짜기보다 검증된 **라이브러리**나 **오픈소스** 활용을 최우선으로 제안합니다.
    *   기존 레거시 코드가 있다면 무리하게 새로 짜지 말고 재사용합니다.

2.  **개념 탑재 우선 (Concept First)**
    *   코드를 짜기 전에 **핵심 개념과 도입 이유**를 사용자에게 먼저 브리핑합니다. (무지성 코드 생성 금지)

3.  **1,500줄의 법칙과 모듈화 (Strict Modularity)**
    *   **Rule of 1500**: 모든 소스 파일은 1,500줄을 넘기지 않도록 관리합니다. 길어지면 즉시 분리를 제안합니다.

4.  **교차 검증과 점진적 리팩토링 (Safety Verification)**
    *   **설계 검증**: 대규모 로직 변경 시 *"이 로직에 구멍이 없을까?"* 스스로 자문한 뒤 사용자에게 컨펌받습니다.
    *   **점진적 적용**: 한 번에 모든 것을 바꾸려 하지 말고, 작동하는 상태를 유지하며 조금씩 개선합니다.

5.  **명명 규칙의 구조화 (Structured Naming)**
    *   `data`, `handler` 같은 모호한 이름 금지.
    *   **형식**: `[도메인]_[대상]_[동작]` (예: `Auth_Login_SubmitBtn`)

6.  **샌드박스 검증 전략 (Sandbox Strategy)**
    *   핵심 기능을 수정할 때는 본체 코드를 바로 건드리지 않습니다.
    *   **`_sandbox/test.html`** 등 별도 파일에서 기능을 완벽히 검증한 후 이식(Porting)합니다.
    *   **승인 후 적용 (Explicit Approval)**: 샌드박스 테스트 코드는 **사용자의 명시적 승인 전까지는 절대로 마스터 코드에 자동 적용하지 않습니다.** (AI 독단적 판단 금지)

## 2.5. 개발자의 태도 (Pro Developer Mindset)
규칙은 아니지만, 우리가 지향해야 할 철학입니다.

1.  **YAGNI (You Aren't Gonna Need It)**
    *   "나중에 필요할지도 몰라"라며 미리 만들지 마세요. **지금 당장 필요한 것만** 만듭니다.
2.  **보이스카우트 규칙 (Boy Scout Rule)**
    *   "머물렀던 자리보다 더 깨끗하게." 코드를 수정하러 들어갔다면, 주변의 죽은 코드나 더러운 주석도 같이 정리하고 나오세요.
3.  **빨리 실패하기 (Fail Fast)**
    *   에러를 숨기지 마세요. 문제가 생기면 그 즉시 멈추고 로그를 뿜어야, 나중에 더 큰 재앙을 막을 수 있습니다.

## 3. AI 작업 시 유의사항 ("이것만은 꼭 지켜라")
1.  **"작업 마무리 원칙 (Session End)"**:
    *   사용자가 **"오늘 작업 끝낼게"**라고 할 때만 백업/문서화/요약을 수행합니다.
    *   위험한 작업 전에는 AI가 먼저 백업을 제안합니다.
2.  **"대화하자" 프로토콜**:
    *   사용자가 **"대화하자"**라고 하면, **절대 바로 코드를 작성하지 않습니다.**
    *   구현 계획과 설계를 텍스트로 먼저 의논합니다. (선토의 후코딩)
3.  **"업데이트 패키징 (Update Packaging)"**:
    *   업데이트 요청 시, 변경된 파일들을 압축(.zip)하여 **`_update` 폴더**에 저장합니다.

## 4. 사용자 권장 프롬프트 (Cheatsheet)
미래의 나(사용자)를 위한 복사/붙여넣기용 섹션.

### [Start] 작업 시작 시
> **"작업 시작 전에 `AI_GUIDE.md` 파일 먼저 정독해줘. (필요하면 `chat/` 폴더 최근 기록도 참고해). 한글로 대화하자."**

### [End] 작업 종료 시
> **"오늘 작업 끝낼게. 1) `project_backup.py` 백그라운드 실행(기다리지 말고 즉시 종료), 2) 변경된 규칙은 `AI_GUIDE.md`에 업데이트, 3) 오늘 대화 내용 요약해서 `chat/` 폴더에 저장해줘."**

---

## 5. [TIP] 새 프로젝트 시작 가이드 (New Project Kickoff)
새로운 프로젝트를 시작할 때 이 파일을 복사해서 사용하세요.

1.  **파일 생성**: 프로젝트 최상위 폴더에 `AI_GUIDE.md`를 생성하고 이 내용을 붙여넣습니다.
2.  **빈칸 채우기**: `1. 배포 및 운영 환경` 내용을 프로젝트에 맞게 채웁니다.
3.  **첫 프롬프트**: AI에게 이 헌법을 선포하고 백업 시스템을 구축합니다.
    > **"새 프로젝트 시작할 거야. `AI_GUIDE.md` 읽고 숙지해. 그리고 문서 맨 뒤에 있는 [만능 백업 스크립트] 코드를 사용해서 `project_backup.py` 파일을 생성해줘. 앞으로 이 파일로 백업할 거야."**

## 6. [Resource] 만능 백업 스크립트 (Universal Backup Script)
새 프로젝트 시작 시, 아래 코드를 `project_backup.py`로 만들어달라고 요청하면 즉시 백업 시스템이 구축됩니다.

```python
import os
import shutil
import datetime

# === 설정 (Configuration) ===
BACKUP_DIR_NAME = 'backup'  # 백업 폴더명
MAX_BACKUPS = 30            # 보관할 백업 개수 (오래된 것부터 삭제)

# 백업할 확장자 및 폴더 (프로젝트 성격에 맞게 수정 가능)
INCLUDE_EXTENSIONS = ['.py', '.js', '.html', '.css', '.json', '.md', '.txt', '.bat', '.sh']
INCLUDE_FOLDERS = ['js', 'css', 'static', 'templates', 'src', '_sandbox']
EXCLUDE_DIRS = ['__pycache__', 'node_modules', '.git', 'venv', 'env', '.idea', '.vscode', '_update']

def create_backup():
    base_dir = os.getcwd()
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_root = os.path.join(base_dir, BACKUP_DIR_NAME)
    target_dir = os.path.join(backup_root, f"backup_{timestamp}")

    if not os.path.exists(backup_root):
        os.makedirs(backup_root)

    print(f"[Backup] Creating backup at: {target_dir}")
    os.makedirs(target_dir)

    # 1. 파일 복사
    file_count = 0
    for root, dirs, files in os.walk(base_dir):
        # 제외 폴더 건너뛰기
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and d != BACKUP_DIR_NAME]
        
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in INCLUDE_EXTENSIONS:
                src_path = os.path.join(root, file)
                rel_path = os.path.relpath(src_path, base_dir)
                dst_path = os.path.join(target_dir, rel_path)
                
                os.makedirs(os.path.dirname(dst_path), exist_ok=True)
                shutil.copy2(src_path, dst_path)
                file_count += 1

    # 2. 폴더 통째로 복사 (INCLUDE_FOLDERS)
    for folder in INCLUDE_FOLDERS:
        src_path = os.path.join(base_dir, folder)
        if os.path.exists(src_path):
            dst_path = os.path.join(target_dir, folder)
            if os.path.exists(dst_path): continue # 위에서 파일 단위로 이미 복사됨
            shutil.copytree(src_path, dst_path, dirs_exist_ok=True)

    print(f"[Backup] Success! {file_count} files backed up.")
    
    # 3. 오래된 백업 정리
    backups = sorted([os.path.join(backup_root, d) for d in os.listdir(backup_root) if d.startswith('backup_')])
    while len(backups) > MAX_BACKUPS:
        oldest = backups.pop(0)
        print(f"[Cleanup] Removing old backup: {oldest}")
        shutil.rmtree(oldest)

if __name__ == "__main__":
    create_backup()
```

## 7. [Template] 원페이지 기획서 (PRD) 양식
새 프로젝트 시작 전, 이 양식을 채워서 AI에게 주면 개발 속도가 비약적으로 빨라집니다.

```markdown
# [프로젝트명] 기획서 (PRD)

## 1. 프로젝트 한 줄 요약 (Objective)
*   **누구를 위해**: (예: 유치원 선생님들을 위해)
*   **어떤 문제 해결**: (예: 그림카드를 일일이 오리고 코팅하는 번거로움을 없애기 위해)
*   **무엇을 만드나**: (예: 웹 기반 자동 그림카드 생성 자판기)

## 2. 핵심 사용자 시나리오 (User Stories)
1.  사용자가 접속하면 [메인 화면]이 보인다.
2.  사용자가 [기능]을 실행하면 [결과]가 나온다.
3.  ...

## 3. 필수 기능 명세 (Core Features)
*   **P0 (필수)**: (예: 검색, 인쇄, 드래그앤드롭)
*   **P1 (있으면 좋음)**: (예: 다크 모드, 즐겨찾기)

## 4. 기술적 제약 사항 (Constraints)
*   (예: 파이썬만 사용 가능, 인터넷 없는 환경 고려 등)
```
