# SENSOVIA 빌드 지침서

## 빠른 시작

### 1단계: 의존성 설치
```bash
# Node.js 패키지 설치
npm install

# Python 패키지 설치 (PyInstaller 포함)
pip install -r backend/requirements.txt
```

### 2단계: 빌드 실행
```bash
# 완전 자동화 빌드 (권장)
npm run build:full-raspberry      # ARM64 (64-bit)
npm run build:full-raspberry-32   # ARMv7l (32-bit)
```

### 3단계: 배포
빌드 완료 후 `dist/sensovia-raspberry-{arch}/` 폴더를 라즈베리파이에 복사하고 `start_sensovia.sh`를 실행하세요.

## 상세 빌드 옵션

### 개발 모드 실행
```bash
# 개발 서버 시작 (Python 스크립트 직접 실행)
npm start

# 또는 Python 서버만 테스트
npm run test:server
```

### 단계별 빌드
```bash
# 1. Python 실행파일만 빌드
npm run build:python

# 2. 일렉트론 앱만 빌드
npm run build:raspberry        # ARM64
npm run build:raspberry-32     # ARMv7l
```

## 빌드 시스템 특징

### 🚀 자동 서버 시작
- 일렉트론 앱 시작 시 Python 웹소켓 서버를 자동으로 실행
- `SERVER_READY` 신호를 받은 후 프론트엔드 창 생성
- 앱 종료 시 Python 프로세스 자동 정리

### 📦 스마트 실행파일 선택
- **개발 모드**: Python 스크립트 직접 실행
- **배포 모드**: PyInstaller 실행파일 우선 사용, 없으면 Python 스크립트 fallback

### 🔧 완전 자동화
- Python 의존성 자동 설치
- PyInstaller 실행파일 자동 생성
- 일렉트론 앱 빌드 및 패키징
- 배포용 폴더 구조 자동 생성

## 파일 구조

```
SENSOVIA/
├── electron/
│   ├── main.js              # 메인 프로세스 (서버 시작 로직 포함)
│   └── preload.js
├── backend/
│   ├── ws_server.py         # 웹소켓 서버 (SERVER_READY 신호 포함)
│   ├── build_executable.py # PyInstaller 빌드 스크립트
│   ├── requirements.txt     # Python 의존성
│   └── dist/
│       └── ws_server        # PyInstaller 실행파일
├── app/                     # 프론트엔드 파일들
├── build_raspberry.py       # 통합 빌드 스크립트
├── package.json            # npm 스크립트 및 electron-builder 설정
└── dist/                   # 빌드 결과
    └── sensovia-raspberry-{arch}/
        ├── app/            # 일렉트론 앱
        ├── start_sensovia.sh
        └── README.md
```

## 주요 구현 사항

### 1. 서버 우선 시작 방식
```javascript
// main.js에서 구현
function startPythonServer() {
  // Python 서버 실행
  pythonProcess = spawn(command, args);
  
  // SERVER_READY 신호 대기
  pythonProcess.stdout.on('data', (data) => {
    if (message.trim() === 'SERVER_READY') {
      createWindow(); // 서버 준비 후 창 생성
    }
  });
}
```

### 2. 경로 자동 감지
```javascript
// 개발/배포 모드에 따른 자동 경로 설정
if (isDev) {
  scriptPath = path.join(__dirname, '..', 'backend', 'ws_server.py');
} else {
  // 실행파일 우선, 없으면 Python 스크립트
  executablePath = path.join(process.resourcesPath, 'backend', 'dist', 'ws_server');
}
```

### 3. 완전 자동화 빌드
```python
# build_raspberry.py에서 구현
steps = [
  ("의존성 확인", self.check_dependencies),
  ("Python 의존성 설치", self.install_python_dependencies),
  ("파이썬 실행파일 빌드", self.build_python_executable),
  ("일렉트론 앱 빌드", lambda: self.build_electron_app(arch)),
  ("배포 패키지 생성", lambda: self.create_deployment_package(arch))
]
```

## 메모리 기반 개선사항

이 빌드 시스템은 이전 메모리의 다음 사항들을 반영했습니다:

- ✅ **RF 샷 LED 깜빡임**: `blink_leds_during_rf_shot()` 함수 유지
- ✅ **ARM64 아키텍처 지원**: `npm run build:raspberry` (ARM64) 및 `build:raspberry-32` (ARMv7l)
- ✅ **자동화된 빌드**: Python 가상환경과 의존성 자동 번들링
- ✅ **일렉트론 통합**: 백엔드 서버 자동 시작 및 프론트엔드 창 생성

## 문제 해결

### 빌드 실패 시
1. Python 및 Node.js 버전 확인
2. 의존성 재설치: `npm install && pip install -r backend/requirements.txt`
3. 빌드 캐시 정리: `npm run build:python` (임시 파일 정리 옵션 선택)

### 실행 실패 시
1. 실행 권한 확인: `chmod +x start_sensovia.sh`
2. Python 서버 직접 테스트: `npm run test:server`
3. 로그 확인: 터미널에서 직접 실행

이 빌드 시스템을 통해 라즈베리파이에서 안정적으로 작동하는 SENSOVIA 앱을 배포할 수 있습니다.
