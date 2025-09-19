# SENSOVIA 라즈베리파이 배포 가이드

## 개요
이 가이드는 SENSOVIA 일렉트론 앱을 라즈베리파이에 배포하는 방법을 설명합니다.
서버와 클라이언트를 분리하여 안정적인 실행을 보장합니다.

## 1단계: 윈도우에서 빌드

### 1.1 의존성 설치
```bash
npm install
```

### 1.2 라즈베리파이용 빌드
```bash
# 라즈베리파이 4/5 (ARM64)용 - 디렉토리 형태로 빌드 (권장)
npm run build:raspberry-simple

# AppImage 형태로 빌드 (Linux 환경에서만 가능)
npm run build:raspberry

# 라즈베리파이 3 (ARM 32bit)용 (필요시)
npm run build:raspberry-32
```

**윈도우에서는 `npm run build:raspberry-simple`을 사용하세요.**

빌드 완료 후 `dist/` 폴더에 다음 파일들이 생성됩니다:
- `linux-arm64-unpacked/` 폴더 (라즈베리파이 4/5용 - 권장)
- `SENSOVIA-1.0.0-arm64.AppImage` (Linux 환경에서 빌드 시)
- `SENSOVIA-1.0.0-armv7l.AppImage` (라즈베리파이 3용)

## 2단계: 라즈베리파이 준비

### 2.1 필요한 파일 복사
라즈베리파이에 다음 파일들을 복사합니다:

```bash
# 윈도우에서 라즈베리파이로 복사할 파일들 (디렉토리 빌드 사용 시)
- dist/linux-arm64-unpacked/ 폴더 전체
- backend/ 폴더 전체
- start_electron.sh

# 또는 AppImage 사용 시 (Linux에서 빌드한 경우)
- dist/SENSOVIA-1.0.0-arm64.AppImage
- backend/ 폴더 전체
- start_electron.sh
```

### 2.2 디렉토리 구조 설정

**디렉토리 빌드 사용 시 (권장):**
```bash
# 라즈베리파이에서 실행
sudo mkdir -p /opt/myapp
sudo mkdir -p /opt/sensovia-backend

# 파일 복사 (예시 - 실제 경로에 맞게 수정)
sudo cp -r linux-arm64-unpacked /opt/myapp/
sudo cp -r backend/* /opt/sensovia-backend/
sudo cp start_electron.sh /opt/myapp/

# 실행 권한 부여
sudo chmod +x /opt/myapp/linux-arm64-unpacked/sensovia-electron
sudo chmod +x /opt/myapp/start_electron.sh
```

**AppImage 사용 시:**
```bash
# 라즈베리파이에서 실행
sudo mkdir -p /opt/myapp
sudo mkdir -p /opt/sensovia-backend

# 파일 복사 (예시 - 실제 경로에 맞게 수정)
sudo cp SENSOVIA-1.0.0-arm64.AppImage /opt/myapp/
sudo cp -r backend/* /opt/sensovia-backend/
sudo cp start_electron.sh /opt/myapp/

# 실행 권한 부여
sudo chmod +x /opt/myapp/SENSOVIA-1.0.0-arm64.AppImage
sudo chmod +x /opt/myapp/start_electron.sh
```

## 3단계: 백엔드 서비스 설정

### 3.1 Python 가상환경 설정
```bash
cd /opt/sensovia-backend
python3 -m venv venv
source venv/bin/activate
pip install websockets RPi.GPIO
```

### 3.2 백엔드 서비스 파일 생성
```bash
sudo nano /etc/systemd/system/motor-backend.service
```

다음 내용을 입력:
```ini
[Unit]
Description=SENSOVIA Motor Backend Server
After=network.target
Wants=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/opt/sensovia-backend
Environment=PATH=/opt/sensovia-backend/venv/bin
ExecStart=/opt/sensovia-backend/venv/bin/python ws_server.py
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 3.3 서비스 활성화
```bash
sudo systemctl daemon-reload
sudo systemctl enable motor-backend.service
sudo systemctl start motor-backend.service

# 상태 확인
sudo systemctl status motor-backend.service
```

## 4단계: 일렉트론 앱 자동 시작 설정

### 4.1 자동 시작 서비스 생성
```bash
sudo nano /etc/systemd/system/sensovia-electron.service
```

다음 내용을 입력:
```ini
[Unit]
Description=SENSOVIA Electron App
After=graphical-session.target motor-backend.service
Wants=graphical-session.target
Requires=motor-backend.service

[Service]
Type=simple
User=pi
Environment=DISPLAY=:0
ExecStart=/opt/myapp/start_electron.sh
Restart=on-failure
RestartSec=10
StandardOutput=append:/home/pi/electron.log
StandardError=append:/home/pi/electron.log

[Install]
WantedBy=graphical-session.target
```

### 4.2 서비스 활성화
```bash
sudo systemctl daemon-reload
sudo systemctl enable sensovia-electron.service

# 사용자 서비스로도 등록 (GUI 환경에서 실행)
systemctl --user daemon-reload
systemctl --user enable sensovia-electron.service
```

## 5단계: 부팅 시 자동 실행 설정

### 5.1 데스크톱 환경에서 자동 시작
```bash
mkdir -p ~/.config/autostart
nano ~/.config/autostart/sensovia.desktop
```

다음 내용을 입력:
```ini
[Desktop Entry]
Type=Application
Name=SENSOVIA
Exec=/opt/myapp/start_electron.sh
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
```

## 6단계: 테스트 및 확인

### 6.1 서비스 상태 확인
```bash
# 백엔드 서버 상태
sudo systemctl status motor-backend.service

# 포트 확인
netstat -tlnp | grep 8765
```

### 6.2 수동 테스트
```bash
# 백엔드 서버 수동 시작 (테스트용)
cd /opt/sensovia-backend
source venv/bin/activate
python ws_server.py &

# 일렉트론 앱 수동 시작 (테스트용)
/opt/myapp/start_electron.sh &
```

### 6.3 로그 확인
```bash
# 백엔드 서버 로그
sudo journalctl -u motor-backend.service -f

# 일렉트론 앱 로그
tail -f ~/electron.log
```

## 7단계: 전체화면 모드 제어

### 7.1 전체화면 토글
- **F11**: 전체화면 ↔ 창 모드 토글
- **Alt + Space → F**: 창 메뉴에서 전체화면 해제
- **Alt + Tab**: 다른 창으로 전환

### 7.2 강제 종료 (필요시)
```bash
# 프로세스 확인
ps aux | grep SENSOVIA

# 강제 종료
pkill -f SENSOVIA
```

## 8단계: 재부팅 테스트

```bash
sudo reboot
```

재부팅 후 다음 순서로 실행됩니다:
1. `motor-backend.service` → 8765 포트 오픈
2. `start_electron.sh` → 포트 대기 → 포트 감지
3. `SENSOVIA AppImage` → 전체화면으로 실행

## 트러블슈팅

### 백엔드 서버가 시작되지 않는 경우
```bash
# 로그 확인
sudo journalctl -u motor-backend.service -n 50

# 수동 실행으로 오류 확인
cd /opt/sensovia-backend
source venv/bin/activate
python ws_server.py
```

### 일렉트론 앱이 시작되지 않는 경우
```bash
# 로그 확인
tail -n 50 ~/electron.log

# 포트 확인
echo >/dev/tcp/127.0.0.1/8765 && echo "포트 열림" || echo "포트 닫힘"

# 수동 실행
/opt/myapp/start_electron.sh
```

### AppImage 실행 권한 오류
```bash
sudo chmod +x /opt/myapp/SENSOVIA-1.0.0-arm64.AppImage
```

## 유용한 명령어

```bash
# 서비스 재시작
sudo systemctl restart motor-backend.service
sudo systemctl restart sensovia-electron.service

# 서비스 중지
sudo systemctl stop motor-backend.service
sudo systemctl stop sensovia-electron.service

# 로그 실시간 모니터링
sudo journalctl -u motor-backend.service -f
tail -f ~/electron.log

# 스크립트만 테스트
/opt/myapp/start_electron.sh &
```
