# SENSOVIA Motor Control System

라즈베리파이용 모터 제어 및 RF 시스템을 위한 일렉트론 애플리케이션

## 🚀 주요 특징

- **안정적인 서버 시작**: 파이썬 웹소켓 서버를 먼저 실행한 후 프론트엔드 창 생성
- **완전 자동화 빌드**: PyInstaller와 electron-builder를 통한 원클릭 배포
- **스마트 실행**: 개발 모드에서는 Python 스크립트, 배포 모드에서는 실행파일 자동 선택
- **라즈베리파이 최적화**: ARM64/ARMv7l 아키텍처 지원
- **GPIO/RF/EEPROM 제어**: 하드웨어 통합 제어 시스템

## 🛠️ 빠른 시작

### 개발 환경 설정
```bash
# 의존성 설치
npm install
pip install -r backend/requirements.txt

# 개발 모드 실행
npm start
```

### 라즈베리파이용 빌드
```bash
# 완전 자동화 빌드 (권장)
npm run build:full-raspberry      # ARM64 (64-bit)
npm run build:full-raspberry-32   # ARMv7l (32-bit)
```

## 📁 프로젝트 구조

```
SENSOVIA/
├── electron/
│   ├── main.js              # 메인 프로세스 (서버 시작 로직)
│   └── preload.js
├── backend/
│   ├── ws_server.py         # 웹소켓 서버 (SERVER_READY 신호)
│   ├── build_executable.py # PyInstaller 빌드 스크립트
│   └── requirements.txt     # Python 의존성
├── app/                     # 프론트엔드 파일들
├── build_raspberry.py       # 통합 빌드 스크립트
└── dist/                   # 빌드 결과
```

## 🔧 시스템 아키텍처

```
┌─────────────────────────────────────────┐
│           Electron Main Process         │
│  ┌─────────────────────────────────────┐ │
│  │     Python WebSocket Server        │ │
│  │     (ws_server.py or executable)   │ │
│  │                                    │ │
│  │  ┌──────────────────────────────┐  │ │
│  │  │        Motor Control         │  │ │
│  │  │        GPIO Control          │  │ │
│  │  │        RF Control            │  │ │
│  │  │        EEPROM Control        │  │ │
│  │  └──────────────────────────────┘  │ │
│  └─────────────────────────────────────┘ │
│                    │                     │
│                    │ SERVER_READY        │
│                    ▼                     │
│  ┌─────────────────────────────────────┐ │
│  │        Electron Renderer           │ │
│  │        (Frontend UI)               │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## 📋 사용 가능한 명령어

```bash
# 개발
npm start                    # 개발 모드 실행
npm run test:server         # Python 서버만 테스트

# 빌드
npm run build:python        # PyInstaller 실행파일만 빌드
npm run build:raspberry     # 일렉트론 앱만 빌드 (ARM64)
npm run build:raspberry-32  # 일렉트론 앱만 빌드 (ARMv7l)

# 완전 자동화 빌드
npm run build:full-raspberry    # 전체 빌드 (ARM64)
npm run build:full-raspberry-32 # 전체 빌드 (ARMv7l)
```

## 🎯 핵심 구현 사항

### 1. 서버 우선 시작 방식
- 일렉트론 앱 시작 시 Python 웹소켓 서버를 먼저 실행
- `SERVER_READY` 신호를 받은 후 프론트엔드 창 생성
- 앱 종료 시 Python 프로세스 자동 정리

### 2. 스마트 실행파일 선택
- **개발 모드**: Python 스크립트 직접 실행
- **배포 모드**: PyInstaller 실행파일 우선, 없으면 Python 스크립트 fallback

### 3. 완전 자동화 빌드
- Python 의존성 자동 설치
- PyInstaller 실행파일 자동 생성
- 일렉트론 앱 빌드 및 패키징
- 배포용 폴더 구조 자동 생성

## 📖 문서

- [빌드 지침서](BUILD_INSTRUCTIONS.md) - 상세한 빌드 방법
- [배포 가이드](DEPLOYMENT_GUIDE.md) - 라즈베리파이 배포 방법
- [WebSocket 통합 가이드](WebSocket-Integration-Guide.md) - API 문서

## 🔧 시스템 요구사항

### 개발 환경
- Node.js 16+
- Python 3.7+
- npm 또는 yarn

### 라즈베리파이
- Raspberry Pi 4/5 (권장)
- 최소 4GB RAM
- Raspberry Pi OS (64-bit 권장)
- GPIO/I2C/시리얼 포트 접근 권한

## 🚨 문제 해결

### 빌드 실패 시
```bash
# 의존성 재설치
npm install
pip install -r backend/requirements.txt

# 빌드 캐시 정리
rm -rf dist/ backend/build/ backend/__pycache__/
```

### 실행 실패 시
```bash
# Python 서버 직접 테스트
npm run test:server

# 권한 확인 (라즈베리파이)
sudo usermod -a -G gpio,i2c,dialout pi
```

## 📝 버전 정보

- **버전**: 1.0.0
- **일렉트론**: 28.2.1
- **Python**: 3.7+
- **아키텍처**: ARM64, ARMv7l

## 👥 개발팀

SENSOVIA Team - 모터 제어 시스템 전문 개발팀

---

더 자세한 정보는 각 문서를 참조하세요.
