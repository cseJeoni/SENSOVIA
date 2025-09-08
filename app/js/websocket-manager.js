/**
 * WebSocket Manager - 모든 페이지에서 공통으로 사용하는 WebSocket 연결 관리자
 * 일렉트론 앱 시작 시 자동으로 웹소켓 연결하고 모터(/dev/usb-motor)와 통신
 */

class WebSocketManager {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000; // 2초
        this.serverUrl = 'ws://localhost:8765'; // 백엔드 서버 주소
        this.eventListeners = new Map(); // 커스텀 이벤트 리스너들
        this.motorStatus = {
            connected: false,
            position: 0,
            force: 0,
            sensor: 0,
            setPos: 0,
            gpio18: 'UNKNOWN',
            gpio23: 'UNKNOWN',
            needle_tip_connected: false
        };
        
        // 자동 연결 시작
        this.connect();
        
        // 페이지 언로드 시 연결 정리
        window.addEventListener('beforeunload', () => {
            this.disconnect();
        });
    }

    /**
     * WebSocket 서버에 연결
     */
    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('[WebSocket] 이미 연결되어 있습니다.');
            return;
        }

        try {
            console.log(`[WebSocket] 서버 연결 시도: ${this.serverUrl}`);
            this.ws = new WebSocket(this.serverUrl);
            
            this.ws.onopen = () => {
                console.log('[WebSocket] 서버 연결 성공');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                
                // 모터 자동 연결 시도
                this.connectMotor();
                
                // 연결 성공 이벤트 발생
                this.emit('connected');
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('[WebSocket] 메시지 파싱 오류:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log('[WebSocket] 연결 종료:', event.code, event.reason);
                this.isConnected = false;
                this.emit('disconnected');
                
                // 자동 재연결 시도
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`[WebSocket] ${this.reconnectDelay}ms 후 재연결 시도 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                    setTimeout(() => this.connect(), this.reconnectDelay);
                } else {
                    console.error('[WebSocket] 최대 재연결 시도 횟수 초과');
                    this.emit('reconnect_failed');
                }
            };

            this.ws.onerror = (error) => {
                console.error('[WebSocket] 연결 오류:', error);
                this.emit('error', error);
            };

        } catch (error) {
            console.error('[WebSocket] 연결 생성 오류:', error);
            this.emit('error', error);
        }
    }

    /**
     * WebSocket 연결 종료
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.isConnected = false;
        }
    }

    /**
     * 모터 자동 연결
     */
    connectMotor() {
        const motorConnectCommand = {
            cmd: 'connect',
            port: 'auto', // /dev/usb-motor 자동 연결
            baudrate: 19200,
            parity: 'none',
            databits: 8,
            stopbits: 1
        };
        
        this.sendCommand(motorConnectCommand);
        console.log('[Motor] 자동 연결 명령 전송');
    }

    /**
     * 서버로 명령 전송
     */
    sendCommand(command) {
        if (!this.isConnected || !this.ws) {
            console.warn('[WebSocket] 연결되지 않음. 명령 전송 실패:', command);
            return false;
        }

        try {
            this.ws.send(JSON.stringify(command));
            console.log('[WebSocket] 명령 전송:', command);
            return true;
        } catch (error) {
            console.error('[WebSocket] 명령 전송 오류:', error);
            return false;
        }
    }

    /**
     * 서버로부터 받은 메시지 처리
     */
    handleMessage(data) {
        switch (data.type) {
            case 'status':
                // 모터 상태 업데이트
                if (data.data) {
                    this.motorStatus = { ...this.motorStatus, ...data.data };
                    this.emit('motor_status', this.motorStatus);
                }
                break;
                
            case 'serial':
                // 시리얼 통신 결과
                console.log('[Motor] 연결 결과:', data.result);
                this.emit('motor_connect_result', data.result);
                break;
                
            case 'eeprom_read':
                // EEPROM 읽기 결과
                console.log('[EEPROM] 읽기 결과:', data.result);
                this.emit('eeprom_read', data.result);
                break;
                
            case 'eeprom_write':
                // EEPROM 쓰기 결과
                console.log('[EEPROM] 쓰기 결과:', data.result);
                this.emit('eeprom_write', data.result);
                break;
                
            case 'error':
                console.error('[WebSocket] 서버 오류:', data.result);
                this.emit('server_error', data.result);
                break;
                
            default:
                console.log('[WebSocket] 알 수 없는 메시지 타입:', data);
        }
    }

    /**
     * 모터 위치 이동
     */
    moveMotor(position, mode = 'position') {
        const command = {
            cmd: 'move',
            position: parseInt(position),
            mode: mode
        };
        return this.sendCommand(command);
    }

    /**
     * EEPROM 데이터 읽기
     */
    readEEPROM(mtrVersion = '2.0', country = 'CLASSYS') {
        const command = {
            cmd: 'eeprom_read',
            mtrVersion: mtrVersion,
            country: country
        };
        return this.sendCommand(command);
    }

    /**
     * EEPROM 데이터 쓰기
     */
    writeEEPROM(tipType, shotCount, year, month, day, makerCode, mtrVersion = '2.0', country = 'CLASSYS') {
        const command = {
            cmd: 'eeprom_write',
            tipType: tipType,
            shotCount: shotCount,
            year: year,
            month: month,
            day: day,
            makerCode: makerCode,
            mtrVersion: mtrVersion,
            country: country
        };
        return this.sendCommand(command);
    }

    /**
     * 이벤트 리스너 등록
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * 이벤트 리스너 제거
     */
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * 이벤트 발생
     */
    emit(event, data = null) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[WebSocket] 이벤트 콜백 오류 (${event}):`, error);
                }
            });
        }
    }

    /**
     * 연결 상태 확인
     */
    getConnectionStatus() {
        return {
            websocket: this.isConnected,
            motor: this.motorStatus.connected,
            motorStatus: this.motorStatus
        };
    }

    /**
     * 수동 재연결
     */
    reconnect() {
        this.reconnectAttempts = 0;
        this.disconnect();
        setTimeout(() => this.connect(), 1000);
    }
}

// 전역 WebSocket 매니저 인스턴스 생성
window.wsManager = new WebSocketManager();

// 전역 함수로 노출 (하위 호환성)
window.connectWebSocket = () => window.wsManager.connect();
window.sendWebSocketCommand = (command) => window.wsManager.sendCommand(command);
window.getMotorStatus = () => window.wsManager.getConnectionStatus();

console.log('[WebSocket Manager] 초기화 완료');
