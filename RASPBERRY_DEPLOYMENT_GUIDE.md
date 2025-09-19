# SENSOVIA 라즈베리파이 배포 가이드

이 가이드는 SENSOVIA Electron 앱을 라즈베리파이에서 직접 빌드하고 배포하는 방법을 설명합니다.

## 시스템 요구사항

- **라즈베리파이**: 4 또는 5 (ARM64 아키텍처)
- **운영체제**: Raspberry Pi OS (64-bit)
- **메모리**: 최소 4GB RAM 권장
- **저장공간**: 최소 4GB 여유 공간 (빌드 과정에서 필요)

## 1단계: 라즈베리파이에서 프로젝트 준비

### 1.1 프로젝트 파일 전송
```bash
# SCP로 전체 프로젝트 전송
scp -r /path/to/SENSOVIA pi@라즈베리파이IP:/home/pi/

# 또는 Git clone
git clone <프로젝트_저장소_URL> /home/pi/SENSOVIA
```

### 1.2 필요한 시스템 패키지 설치
```bash
sudo apt update
sudo apt install -y python3 python3-pip nodejs npm git build-essential
```

### 1.3 Python 의존성 설치
```bash
cd /home/pi/SENSOVIA/backend
pip3 install -r requirements.txt
pip3 install pyinstaller
```

## 2단계: 라즈베리파이에서 빌드

### 2.1 Python 백엔드 빌드
```bash
cd /home/pi/SENSOVIA/backend
python3 build_executable.py
```

### 2.2 Node.js 의존성 설치
```bash
cd /home/pi/SENSOVIA
npm install
```

### 2.3 Electron 앱 빌드
```bash
# ARM64용 빌드 (라즈베리파이 4/5)
npm run build:raspberry-64

# 또는 ARMv7l용 빌드 (구형 라즈베리파이)
npm run build:raspberry-32
```

### 2.4 빌드 결과 확인
빌드 완료 후 다음 폴더가 생성됩니다:
- `dist/linux-arm64-unpacked/` - ARM64용 일렉트론 앱
- `backend/dist/ws_server` - Linux ARM64용 Python 실행파일

## 3단계: 실행 설정

### 3.1 실행 권한 부여
```bash
cd /home/pi/SENSOVIA/dist/linux-arm64-unpacked/
chmod +x sensovia-electron
chmod +x resources/backend/dist/ws_server
```

### 3.2 터미널에서 실행 테스트
```bash
cd /home/pi/SENSOVIA/dist/linux-arm64-unpacked/
DISPLAY=:0 ./sensovia-electron --no-sandbox --disable-gpu
```

### 3.3 GUI에서 더블 클릭 실행 설정

**데스크톱 바로가기 생성**:
```bash
nano /home/pi/Desktop/SENSOVIA.desktop
```

다음 내용 입력:
```ini
[Desktop Entry]
Version=1.0
Type=Application
Name=SENSOVIA
Comment=SENSOVIA Motor Control Application
Exec=/home/pi/SENSOVIA/dist/linux-arm64-unpacked/sensovia-electron --no-sandbox --disable-gpu
Icon=/home/pi/SENSOVIA/dist/linux-arm64-unpacked/resources/app/assets/icon.png
Terminal=false
Categories=Utility;
StartupNotify=true
```

**바로가기 실행 권한 부여**:
```bash
chmod +x /home/pi/Desktop/SENSOVIA.desktop
```

## 4단계: 부팅 시 자동 실행 (선택사항)

### 4.1 자동 시작 설정
```bash
mkdir -p ~/.config/autostart
cp /home/pi/Desktop/SENSOVIA.desktop ~/.config/autostart/
```

## 5단계: 실행 및 테스트

### 5.1 실행 방법
다음 중 원하는 방법으로 실행:

1. **더블 클릭**: 데스크톱의 SENSOVIA 아이콘 더블 클릭
2. **파일 매니저**: `sensovia-electron` 파일 더블 클릭
3. **터미널**: `./sensovia-electron --no-sandbox --disable-gpu`

### 5.2 실행 과정
1. 일렉트론 앱 시작
2. Python 웹소켓 서버 자동 시작 (SERVER_READY 신호 대기)
3. 서버 준비 완료 후 프론트엔드 창 표시
4. RF 샷 시 LED 깜빡임 기능 자동 활성화

### 5.3 종료
- 앱 창을 닫으면 Python 서버도 자동으로 종료됩니다.

## 6단계: 문제 해결

### 6.1 권한 문제
```bash
chmod +x /home/pi/SENSOVIA/dist/linux-arm64-unpacked/sensovia-electron
chmod +x /home/pi/SENSOVIA/dist/linux-arm64-unpacked/resources/backend/dist/ws_server
```

### 6.2 디스플레이 문제
```bash
export DISPLAY=:0
./sensovia-electron --no-sandbox --disable-gpu
```

### 6.3 로그 확인
터미널에서 실행하면 Python 서버와 일렉트론의 로그를 모두 볼 수 있습니다.

## 7단계: 업데이트

새 버전 배포 시:
1. 앱 종료
2. 새로운 `linux-arm64-unpacked/` 폴더로 교체
3. 실행 권한 재설정
4. 앱 재시작

```bash
# 새 버전 빌드
cd /home/pi/SENSOVIA
python3 backend/build_executable.py
npm run build:raspberry-64

# 권한 설정
chmod +x dist/linux-arm64-unpacked/sensovia-electron
chmod +x dist/linux-arm64-unpacked/resources/backend/dist/ws_server
```

## 장점

✅ **간단한 배포**: 폴더 복사 후 바로 실행  
✅ **의존성 없음**: Python 패키지 설치 불필요 (PyInstaller로 포함)  
✅ **자동 시작**: 서버가 일렉트론 내부에서 자동 시작  
✅ **GUI 실행**: 더블 클릭으로 실행 가능  
✅ **안전한 종료**: 앱 종료 시 서버도 자동 종료  
✅ **LED 제어**: RF 샷 시 GPIO LED 자동 제어
