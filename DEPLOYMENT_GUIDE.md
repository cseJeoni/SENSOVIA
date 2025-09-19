# SENSOVIA 라즈베리파이 배포 가이드

## 개요

이 가이드는 SENSOVIA 일렉트론 앱을 라즈베리파이에 배포하는 방법을 설명합니다. 파이썬 웹소켓 서버를 먼저 안정적으로 실행한 후 프론트엔드 창을 띄우는 방식으로 구현되었습니다.

## 시스템 아키텍처

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

## 빌드 방법

### 1. 개발 환경 설정

```bash
# Node.js 의존성 설치
npm install

# Python 의존성 설치
pip install -r backend/requirements.txt
```

### 2. 빌드 옵션

#### 옵션 1: 완전 자동화 빌드 (권장)
```bash
# ARM64 (64-bit 라즈베리파이 OS)
npm run build:full-raspberry

# ARMv7l (32-bit 라즈베리파이 OS)
npm run build:full-raspberry-32
```

#### 옵션 2: 단계별 빌드
```bash
# 1. Python 실행파일 빌드
npm run build:python

# 2. 일렉트론 앱 빌드
npm run build:raspberry        # ARM64
npm run build:raspberry-32     # ARMv7l
```

#### 옵션 3: Python 스크립트만 사용 (PyInstaller 없이)
```bash
npm run build:raspberry-simple
```

### 3. 빌드 결과

빌드 완료 후 `dist/` 폴더에 다음과 같은 구조로 생성됩니다:

```
dist/
├── sensovia-raspberry-arm64/          # 배포 패키지
│   ├── app/                          # 일렉트론 앱
│   │   ├── sensovia-electron         # 실행파일
│   │   ├── resources/
│   │   │   └── backend/              # Python 서버 파일들
│   │   │       ├── ws_server.py      # Python 스크립트
│   │   │       ├── dist/
│   │   │       │   └── ws_server     # PyInstaller 실행파일
│   │   │       └── ...
│   │   └── ...
│   ├── start_sensovia.sh             # 실행 스크립트
│   └── README.md                     # 설치 가이드
└── linux-arm64-unpacked/             # 원본 빌드 결과
```

## 라즈베리파이 배포

### 1. 파일 전송

```bash
# SCP를 사용한 파일 전송
scp -r dist/sensovia-raspberry-arm64/ pi@192.168.1.100:~/

# 또는 USB/SD카드를 통한 전송
```

### 2. 라즈베리파이에서 실행

```bash
# 실행 권한 부여
chmod +x ~/sensovia-raspberry-arm64/start_sensovia.sh

# 앱 실행
cd ~/sensovia-raspberry-arm64/
./start_sensovia.sh
```

### 3. 자동 시작 설정 (선택사항)

```bash
# systemd 서비스 파일 생성
sudo nano /etc/systemd/system/sensovia.service
```

서비스 파일 내용:
```ini
[Unit]
Description=SENSOVIA Motor Control Application
After=graphical-session.target

[Service]
Type=simple
User=pi
Environment=DISPLAY=:0
WorkingDirectory=/home/pi/sensovia-raspberry-arm64
ExecStart=/home/pi/sensovia-raspberry-arm64/start_sensovia.sh
Restart=always
RestartSec=10

[Install]
WantedBy=graphical-session.target
```

서비스 활성화:
```bash
sudo systemctl enable sensovia.service
sudo systemctl start sensovia.service
```

## 시스템 요구사항

### 하드웨어
- Raspberry Pi 4/5 (권장)
- 최소 4GB RAM
- 최소 8GB 저장공간
- GPIO 핀 접근 권한

### 소프트웨어
- Raspberry Pi OS (64-bit 권장)
- X11 또는 Wayland 디스플레이 서버
- Python 3.7+ (PyInstaller 실행파일 사용 시 불필요)

### 권한 설정
```bash
# GPIO 접근 권한
sudo usermod -a -G gpio pi

# I2C 접근 권한 (EEPROM용)
sudo usermod -a -G i2c pi

# 시리얼 포트 접근 권한
sudo usermod -a -G dialout pi
```

## 문제 해결

### 1. 앱이 시작되지 않는 경우

```bash
# 의존성 확인
ldd ~/sensovia-raspberry-arm64/app/sensovia-electron

# 직접 실행으로 에러 확인
cd ~/sensovia-raspberry-arm64/app/
./sensovia-electron --no-sandbox --disable-gpu
```

### 2. Python 서버 연결 실패

```bash
# Python 서버 직접 테스트
cd ~/sensovia-raspberry-arm64/app/resources/backend/
python3 ws_server.py

# 또는 실행파일 테스트
./dist/ws_server
```

### 3. GPIO 접근 오류

```bash
# GPIO 그룹 확인
groups pi

# 권한 재설정
sudo usermod -a -G gpio,i2c,dialout pi
sudo reboot
```

### 4. 메모리 부족

```bash
# 스왑 파일 크기 증가
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# CONF_SWAPSIZE=1024
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

## 개발자 정보

### 로그 확인
- 일렉트론 로그: 터미널에서 직접 실행
- Python 서버 로그: `ws_server.py` 출력 확인
- 시스템 로그: `journalctl -u sensovia.service`

### 디버깅 모드
```bash
# 개발자 도구와 함께 실행
./sensovia-electron --enable-logging --remote-debugging-port=9222
```

### 성능 모니터링
```bash
# CPU/메모리 사용량 확인
htop

# GPU 사용량 확인 (라즈베리파이 4/5)
vcgencmd measure_temp
vcgencmd get_mem gpu
```

## 업데이트

새 버전 배포 시:
1. 기존 앱 종료
2. 새 배포 패키지로 교체
3. 앱 재시작

```bash
# 서비스 중지
sudo systemctl stop sensovia.service

# 파일 교체
rm -rf ~/sensovia-raspberry-arm64/
# 새 파일 복사...

# 서비스 재시작
sudo systemctl start sensovia.service
```

## 지원

문의사항이나 문제가 발생하면 개발팀에 연락하세요.
- 프로젝트: SENSOVIA Motor Control System
- 버전: 1.0.0
- 빌드 날짜: $(date)
