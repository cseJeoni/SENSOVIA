# WebSocket Integration Guide

## 개요
이 프로젝트는 Electron 앱으로 라즈베리파이에서 실행되며, Python WebSocket 서버(`ws_server.py`)를 통해 모터 제어 및 EEPROM 통신을 수행합니다.

## 파일 구조
```
SENSOVIA/
├── app/
│   ├── js/
│   │   ├── websocket-manager.js  # 공통 WebSocket 연결 관리자 (새로 생성)
│   │   ├── ready.js              # ready 페이지 스크립트 (업데이트됨)
│   │   └── ...
│   └── pages/
│       ├── main.html             # 메인 페이지 (업데이트됨)
│       ├── ready.html            # ready 페이지 (업데이트됨)
│       ├── standby.html          # standby 페이지 (업데이트됨)
│       └── ...
├── backend/
│   ├── ws_server.py              # WebSocket 서버
│   ├── motor_threaded_controller.py  # 모터 제어
│   └── ...
└── electron/
    └── main.js                   # Electron 메인 프로세스
```

## 사용법

### 1. 서버 실행
```bash
# 백엔드 서버 시작 (라즈베리파이에서)
cd backend
python ws_server.py
```

### 2. 프론트엔드 실행
```bash
# Electron 앱 시작
npm run dev
```

### 3. WebSocket Manager 사용법

#### 자동 연결
- `websocket-manager.js`가 로드되면 자동으로 `ws://localhost:8765`에 연결
- 연결 성공 시 자동으로 모터(`/dev/usb-motor`)에 연결 시도

#### 이벤트 리스너 등록
```javascript
// WebSocket 연결 상태 모니터링
window.wsManager.on('connected', () => {
    console.log('WebSocket 연결됨');
});

window.wsManager.on('disconnected', () => {
    console.log('WebSocket 연결 해제됨');
});

// 모터 상태 실시간 업데이트
window.wsManager.on('motor_status', (status) => {
    console.log('모터 상태:', status);
    // status.position, status.force, status.sensor 등 사용 가능
});

// EEPROM 데이터 읽기 결과
window.wsManager.on('eeprom_read', (result) => {
    if (result.success) {
        console.log('TIP TYPE:', result.tipType);
        console.log('SHOT COUNT:', result.shotCount);
    }
});
```

#### 명령 전송
```javascript
// 모터 위치 이동
window.wsManager.moveMotor(1000, 'position');

// EEPROM 데이터 읽기
window.wsManager.readEEPROM('2.0', 'CLASSYS');

// EEPROM 데이터 쓰기
window.wsManager.writeEEPROM(
    4,      // tipType (4 = 64PIN)
    628,    // shotCount
    2024,   // year
    12,     // month
    25,     // day
    1,      // makerCode
    '2.0',  // mtrVersion
    'CLASSYS' // country
);

// 직접 명령 전송
window.wsManager.sendCommand({
    cmd: 'connect',
    port: 'auto',
    baudrate: 19200,
    parity: 'none',
    databits: 8,
    stopbits: 1
});
```

#### 연결 상태 확인
```javascript
const status = window.wsManager.getConnectionStatus();
console.log('WebSocket 연결:', status.websocket);
console.log('모터 연결:', status.motor);
console.log('모터 상태:', status.motorStatus);
```

## 주요 기능

### 1. 자동 재연결
- WebSocket 연결이 끊어지면 최대 5회까지 자동 재연결 시도
- 2초 간격으로 재연결 시도

### 2. 모터 제어
- `/dev/usb-motor` 자동 연결
- 위치, 속도, 힘 제어 지원
- 실시간 상태 모니터링

### 3. EEPROM 통신
- MTR 2.0/4.0 지원
- CLASSYS/CUTERA 국가별 설정
- TIP TYPE, SHOT COUNT 자동 업데이트

### 4. GPIO 모니터링
- GPIO18, GPIO23 상태 실시간 모니터링
- 니들팁 연결 상태 감지
- 니들팁 분리 시 자동 경고 모달 표시

## 페이지별 통합 현황

### ✅ 완료된 페이지
- `main.html` - WebSocket Manager 포함
- `ready.html` - WebSocket Manager 포함, 모터 제어 통합
- `standby.html` - WebSocket Manager 포함

### 📝 추가 통합 필요한 페이지
다른 페이지들도 필요에 따라 다음과 같이 WebSocket Manager를 추가할 수 있습니다:

```html
<!-- WebSocket Manager - 모든 페이지 공통 -->
<script src="../js/websocket-manager.js"></script>
```

## 트러블슈팅

### 1. WebSocket 연결 실패
- 백엔드 서버(`ws_server.py`)가 실행 중인지 확인
- 포트 8765가 사용 가능한지 확인
- 방화벽 설정 확인

### 2. 모터 연결 실패
- `/dev/usb-motor` 디바이스 존재 확인
- 시리얼 포트 권한 확인 (`sudo usermod -a -G dialout $USER`)
- 라즈베리파이에서 실행 중인지 확인

### 3. EEPROM 통신 실패
- I2C 활성화 확인 (`sudo raspi-config`)
- smbus2 라이브러리 설치 확인 (`pip install smbus2`)
- EEPROM 하드웨어 연결 확인

## 개발자 노트

### WebSocket 메시지 프로토콜
```javascript
// 명령 전송 형식
{
    "cmd": "connect|disconnect|move|eeprom_read|eeprom_write",
    // 추가 파라미터들...
}

// 응답 수신 형식
{
    "type": "status|serial|eeprom_read|eeprom_write|error",
    "result": "결과 데이터",
    "data": { /* 상태 데이터 */ }
}
```

### 확장 가능한 구조
- 새로운 명령어는 `ws_server.py`의 `handler` 함수에 추가
- 새로운 이벤트는 `WebSocketManager.handleMessage`에 추가
- 페이지별 커스텀 로직은 각 페이지의 JS 파일에서 이벤트 리스너로 구현
