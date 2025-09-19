#!/bin/bash
# ──────────────────────────────────────────────
# SENSOVIA Electron 앱 시작 스크립트
# 백엔드 서버(8765 포트)가 준비될 때까지 대기 후 Electron 실행
# ──────────────────────────────────────────────

LOG_FILE="$HOME/electron.log"
BACKEND_PORT=8765
BACKEND_HOST="127.0.0.1"
MAX_WAIT_TIME=120  # 최대 2분 대기
COUNTER=0

echo "$(date): SENSOVIA Electron 시작 스크립트 실행" >> "$LOG_FILE"
echo "$(date): 백엔드 서버 포트 $BACKEND_PORT 대기 중..." >> "$LOG_FILE"

# 백엔드 포트가 열릴 때까지 대기
while ! (echo >/dev/tcp/$BACKEND_HOST/$BACKEND_PORT) 2>/dev/null; do
  sleep 0.5
  COUNTER=$((COUNTER + 1))
  
  # 60초마다 로그 출력 (120회 = 60초)
  if [ $((COUNTER % 120)) -eq 0 ]; then
    echo "$(date): 백엔드 서버 대기 중... ($((COUNTER / 2))초 경과)" >> "$LOG_FILE"
  fi
  
  # 최대 대기 시간 초과 시 종료
  if [ $COUNTER -ge $((MAX_WAIT_TIME * 2)) ]; then
    echo "$(date): 백엔드 서버 대기 시간 초과 (${MAX_WAIT_TIME}초). 종료합니다." >> "$LOG_FILE"
    exit 1
  fi
done

echo "$(date): 백엔드 서버 포트 $BACKEND_PORT 연결 확인됨!" >> "$LOG_FILE"
echo "$(date): SENSOVIA Electron 앱 실행 중..." >> "$LOG_FILE"

# Electron 실행 (AppImage 또는 디렉토리)
APPIMAGE_PATH="/opt/myapp/SENSOVIA-1.0.0-arm64.AppImage"
ELECTRON_DIR="/opt/myapp/linux-arm64-unpacked"
ELECTRON_EXEC="$ELECTRON_DIR/sensovia-electron"

if [ -f "$APPIMAGE_PATH" ]; then
  echo "$(date): AppImage 실행: $APPIMAGE_PATH" >> "$LOG_FILE"
  exec "$APPIMAGE_PATH" --no-sandbox --disable-gpu
elif [ -f "$ELECTRON_EXEC" ]; then
  echo "$(date): Electron 디렉토리 실행: $ELECTRON_EXEC" >> "$LOG_FILE"
  cd "$ELECTRON_DIR"
  exec "./sensovia-electron" --no-sandbox --disable-gpu
else
  echo "$(date): ERROR - Electron 실행 파일을 찾을 수 없습니다" >> "$LOG_FILE"
  echo "$(date): 확인 경로: $APPIMAGE_PATH, $ELECTRON_EXEC" >> "$LOG_FILE"
  exit 1
fi
