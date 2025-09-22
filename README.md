# SENSOVIA 라즈베리파이 부팅 시 자동 실행 시스템 완전 구축 가이드

## 📋 프로젝트 개요
- **목표**: 라즈베리파이 부팅 시 SENSOVIA Electron 앱이 전체화면으로 자동 실행
- **아키텍처**: 백엔드 서버(Python WebSocket) + 프론트엔드(Electron AppImage)
- **실행 방식**: systemd 서비스 기반 자동 시작
- **타겟 플랫폼**: Raspberry Pi 4/5 (ARM64 아키텍처)

## 🏗️ 시스템 아키텍처

```
라즈베리파이 부팅
    ↓
motor-backend.service (Python WebSocket 서버)
    ↓
sensovia-electron.service (의존성 대기)
    ↓
start_electron.sh (백엔드 준비 확인)
    ↓
SENSOVIA AppImage (전체화면 실행)
```

## 📁 프로젝트 구조

```
SENSOVIA-dev/
├── app/                    # 프론트엔드 HTML/CSS/JS
│   ├── assets/            # 아이콘, 이미지 등
│   ├── css/               # 스타일시트
│   ├── icon/              # SVG 아이콘
│   └── js/                # JavaScript 파일
├── backend/               # Python WebSocket 서버
│   ├── ws_server.py       # 메인 WebSocket 서버
│   ├── motor_threaded_controller.py
│   ├── rf_utils.py
│   └── eeprom_utils.py
├── electron/              # Electron 메인 프로세스
│   ├── main.js            # 메인 프로세스
│   └── preload.js         # 프리로드 스크립트
├── package.json           # 빌드 설정 포함
└── vite.config.js         # Vite 설정
```

## ⚙️ 1. 프로젝트 설정

### 1.1 package.json 핵심 설정

```json
{
  "scripts": {
    "build": "echo 'Skipping vite build for Electron app'",
    "dist:arm64": "electron-builder --linux --arm64"
  },
  "build": {
    "appId": "com.sensovia.app",
    "productName": "SENSOVIA",
    "files": [
      "electron/**/*",
      "app/**/*",
      "!src"
    ],
    "extraResources": [
      {
        "from": "node_modules/ws",
        "to": "node_modules/ws"
      }
    ],
    "linux": {
      "target": [
        {
          "target": "AppImage",
          "arch": ["x64", "arm64"]
        }
      ]
    }
  }
}
```

**핵심 포인트:**
- `extraResources`: ws 모듈을 AppImage에 명시적으로 포함
- `build` 스크립트: Vite 빌드 건너뛰기 (정적 파일 직접 사용)
- ARM64 아키텍처 지원

### 1.2 electron/main.js 설정

```javascript
const win = new BrowserWindow({
  width: 1366,
  height: 768,
  fullscreen: true,  // 전체화면 모드
  autoHideMenuBar: true,
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false,
    preload: path.join(__dirname, 'preload.js'),
  },
});
```

**핵심 포인트:**
- `fullscreen: true`: 부팅 시 전체화면으로 시작
- WebSocket 연결: `ws://127.0.0.1:8765`로 백엔드 서버 연결

## 🔧 2. 라즈베리파이 서비스 설정 (systemd)

### 2.1 백엔드 서비스 설정

**파일 위치**: `/etc/systemd/system/motor-backend.service`

```ini
[Unit]
Description=SENSOVIA Motor Backend Server
After=network.target

[Service]
Type=simple
User=needle-pi
WorkingDirectory=/home/needle-pi/MSN/SENSOVIA-dev/backend
ExecStart=/home/needle-pi/my_env/bin/python /home/needle-pi/MSN/SENSOVIA-dev/backend/ws_server.py
Restart=always
RestartSec=3
Environment=PYTHONPATH=/home/needle-pi/MSN/SENSOVIA-dev/backend

[Install]
WantedBy=multi-user.target
```

**핵심 포인트:**
- 가상환경 Python 경로 사용: `/home/needle-pi/my_env/bin/python`
- 자동 재시작: `Restart=always`
- 네트워크 준비 후 시작: `After=network.target`

### 2.2 프론트엔드 서비스 설정

**파일 위치**: `/etc/systemd/system/sensovia-electron.service`

```ini
[Unit]
Description=SENSOVIA Electron App
After=motor-backend.service
Wants=motor-backend.service

[Service]
Type=simple
User=needle-pi
Environment=DISPLAY=:0
ExecStart=/opt/myapp/start_electron.sh
Restart=always
RestartSec=5

[Install]
WantedBy=graphical.target
```

**핵심 포인트:**
- 백엔드 서비스 의존성: `After=motor-backend.service`
- GUI 환경 필요: `WantedBy=graphical.target`
- 디스플레이 환경 설정: `Environment=DISPLAY=:0`

### 2.3 실행 스크립트 설정

**파일 위치**: `/opt/myapp/start_electron.sh`

```bash
#!/bin/bash

# 로그 파일 생성
LOG_FILE="/home/needle-pi/electron.log"
echo "$(date): Electron 시작 스크립트 실행" >> "$LOG_FILE"

# 백엔드 서비스가 실행될 때까지 대기
echo "$(date): 백엔드 서비스 대기 중..." >> "$LOG_FILE"
while ! systemctl is-active --quiet motor-backend.service; do
    echo "$(date): 백엔드 서비스 대기..." >> "$LOG_FILE"
    sleep 1
done

# 포트가 열릴 때까지 대기
echo "$(date): 포트 8765 대기 중..." >> "$LOG_FILE"
while ! (echo >/dev/tcp/127.0.0.1/8765) 2>/dev/null; do
    sleep 0.5
done

echo "$(date): 백엔드 준비 완료, Electron 실행" >> "$LOG_FILE"

# Electron AppImage 실행
cd /opt/myapp
exec ./SENSOVIA-1.0.0-arm64.AppImage --no-sandbox --disable-gpu >> "$LOG_FILE" 2>&1
```

**핵심 포인트:**
- 백엔드 서비스 상태 확인: `systemctl is-active`
- 포트 대기: TCP 연결 테스트
- 라즈베리파이 최적화 옵션: `--no-sandbox --disable-gpu`

## 🚀 3. 빌드 및 배포 프로세스

### 3.1 윈도우에서 빌드

```bash
# 1. 코드 변경사항 커밋
git add .
git commit -m "변경사항 설명"
git push origin main

```

### 3.2 라즈베리파이에서 빌드와 배포

```bash
# 1. 최신 코드 받기
cd ~/MSN/SENSOVIA-dev
git pull origin main

# 2. 라즈베리파이에서 빌드
npm run dist:arm64

# 3. AppImage 복사
sudo cp dist/SENSOVIA-1.0.0-arm64.AppImage /opt/myapp/
sudo chmod +x /opt/myapp/SENSOVIA-1.0.0-arm64.AppImage

# 4. 서비스 재시작
sudo systemctl restart sensovia-electron.service
```

### 3.3 서비스 활성화 (최초 설정 시)

```bash
# 서비스 등록 및 활성화
sudo systemctl daemon-reload
sudo systemctl enable motor-backend.service
sudo systemctl enable sensovia-electron.service

# 권한 설정
sudo chmod +x /opt/myapp/start_electron.sh
```

## 🔍 4. 문제 해결 및 디버깅

### 4.1 주요 해결된 문제들

1. **Vite 빌드 오류**
   - **문제**: vite.config.js 없음으로 인한 빌드 실패
   - **해결**: vite.config.js 생성 및 build 스크립트 수정

2. **websockets 모듈 누락**
   - **문제**: 시스템 Python에서 websockets 모듈을 찾지 못함
   - **해결**: 가상환경 Python 경로 사용

3. **ws 모듈 AppImage 미포함**
   - **문제**: "Cannot find module 'ws'" 오류
   - **해결**: `extraResources` 설정 추가

4. **스크립트 문법 오류**
   - **문제**: start_electron.sh에서 변수 따옴표 처리 오류
   - **해결**: 변수 따옴표 처리 수정

### 4.2 디버깅 명령어

```bash
# 서비스 상태 확인
sudo systemctl status motor-backend.service
sudo systemctl status sensovia-electron.service

# 로그 확인
tail -f /home/needle-pi/electron.log
sudo journalctl -u motor-backend.service -f
sudo journalctl -u sensovia-electron.service -f

# 포트 확인
netstat -tlnp | grep 8765

# 프로세스 확인
ps aux | grep SENSOVIA
ps aux | grep python

# 서비스 재시작
sudo systemctl restart motor-backend.service
sudo systemctl restart sensovia-electron.service

# 서비스 로그 전체 보기
sudo journalctl -u motor-backend.service --no-pager
sudo journalctl -u sensovia-electron.service --no-pager
```

### 4.3 일반적인 문제 해결

**문제: 백엔드 서비스가 시작되지 않음**
```bash
# Python 가상환경 확인
source /home/needle-pi/my_env/bin/activate
pip list | grep websockets

# 수동으로 백엔드 실행 테스트
cd /home/needle-pi/MSN/SENSOVIA-dev/backend
/home/needle-pi/my_env/bin/python ws_server.py
```

**문제: Electron 앱이 실행되지 않음**
```bash
# AppImage 수동 실행 테스트
cd /opt/myapp
./SENSOVIA-1.0.0-arm64.AppImage --no-sandbox --disable-gpu

# 권한 확인
ls -la /opt/myapp/
```

**문제: 전체화면이 되지 않음**
- `electron/main.js`에서 `fullscreen: true` 설정 확인
- 라즈베리파이 디스플레이 설정 확인

## 📚 5. 향후 프로젝트 적용 가이드

### 5.1 재사용 가능한 템플릿

이 설정을 다른 라즈베리파이 Electron 프로젝트에 적용할 때:

1. **package.json 설정 복사**
   - `extraResources`에 필요한 Node.js 모듈 추가
   - ARM64 빌드 설정 유지

2. **systemd 서비스 파일 수정**
   - 프로젝트 경로 변경
   - 사용자 계정 변경
   - 포트 번호 변경

3. **실행 스크립트 수정**
   - AppImage 파일명 변경
   - 대기할 포트 번호 변경
   - 로그 파일 경로 변경

### 5.2 핵심 성공 요소

- **의존성 관리**: extraResources로 필요한 모듈 명시적 포함
- **서비스 의존성**: systemd로 실행 순서 보장
- **상태 확인**: 포트 대기로 서비스 준비 상태 확인
- **에러 처리**: 자동 재시작 및 로깅으로 안정성 확보

### 5.3 체크리스트

**빌드 전 확인사항:**
- [ ] package.json에 extraResources 설정
- [ ] electron/main.js에 fullscreen 설정
- [ ] 필요한 Node.js 모듈 설치

**배포 전 확인사항:**
- [ ] 라즈베리파이에 Python 가상환경 설정
- [ ] 가상환경에 websockets 설치
- [ ] /opt/myapp/ 디렉토리 생성
- [ ] systemd 서비스 파일 생성

**실행 전 확인사항:**
- [ ] 서비스 파일 권한 설정
- [ ] AppImage 실행 권한 설정
- [ ] 서비스 활성화
- [ ] 재부팅 테스트

## 🎯 6. 실제 사용 예시

### 6.1 개발 워크플로우

```bash
# 1. 윈도우에서 개발
# 코드 수정 후
git add .
git commit -m "기능 추가"
git push origin main
npm run dist:arm64

# 2. 라즈베리파이에서 배포
ssh needle-pi@192.168.1.100
cd ~/MSN/SENSOVIA-dev
git pull origin main
sudo cp dist/SENSOVIA-1.0.0-arm64.AppImage /opt/myapp/
sudo systemctl restart sensovia-electron.service

# 3. 로그 확인
tail -f /home/needle-pi/electron.log
```

### 6.2 유지보수 명령어

```bash
# 서비스 상태 한 번에 확인
sudo systemctl status motor-backend.service sensovia-electron.service

# 모든 로그 한 번에 확인
sudo journalctl -u motor-backend.service -u sensovia-electron.service -f

# 완전 재시작
sudo systemctl stop sensovia-electron.service motor-backend.service
sudo systemctl start motor-backend.service
sudo systemctl start sensovia-electron.service

# 부팅 시 자동 실행 비활성화 (테스트용)
sudo systemctl disable sensovia-electron.service

# 부팅 시 자동 실행 재활성화
sudo systemctl enable sensovia-electron.service
```

## ✅ 7. 최종 확인 및 테스트

### 7.1 시스템 테스트 절차

1. **수동 테스트**
   ```bash
   # 백엔드 수동 실행
   cd /home/needle-pi/MSN/SENSOVIA-dev/backend
   /home/needle-pi/my_env/bin/python ws_server.py
   
   # 다른 터미널에서 프론트엔드 수동 실행
   cd /opt/myapp
   ./SENSOVIA-1.0.0-arm64.AppImage --no-sandbox --disable-gpu
   ```

2. **서비스 테스트**
   ```bash
   sudo systemctl start motor-backend.service
   sudo systemctl start sensovia-electron.service
   ```

3. **재부팅 테스트**
   ```bash
   sudo reboot
   # 재부팅 후 자동으로 앱이 전체화면으로 실행되는지 확인
   ```

### 7.2 성공 지표

- ✅ 라즈베리파이 부팅 시 자동으로 SENSOVIA 앱 실행
- ✅ 전체화면 모드로 실행
- ✅ 백엔드 WebSocket 서버 정상 동작
- ✅ 프론트엔드-백엔드 통신 정상
- ✅ 서비스 재시작 시 정상 복구
- ✅ 로그 파일 정상 생성

---

## 🏆 결론

이 가이드를 따르면 라즈베리파이에서 Electron 앱의 부팅 시 자동 실행을 안정적으로 구현할 수 있습니다. 모든 설정이 완료되면 라즈베리파이를 전원에 연결하기만 하면 자동으로 SENSOVIA 앱이 전체화면으로 실행되어 즉시 사용할 수 있는 상태가 됩니다.

**핵심 성과:**
- 완전 자동화된 부팅 시스템
- 안정적인 서비스 의존성 관리
- 포괄적인 에러 처리 및 로깅
- 재사용 가능한 템플릿 제공

이제 SENSOVIA는 라즈베리파이에서 완전히 자동화된 키오스크 모드로 동작합니다! 🎉