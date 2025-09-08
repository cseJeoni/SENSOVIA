/**
 * WebSocket Client - Electron preload API를 사용하는 클라이언트 측 WebSocket 관리자
 * 페이지 이동 시에도 연결이 유지됩니다.
 */

class WebSocketClient {
    constructor() {
        this.eventListeners = new Map();
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
        
        // Electron API가 있는지 확인
        if (typeof window.electronAPI !== 'undefined') {
            this.setupElectronListeners();
            console.log('[WebSocket Client] Electron API 사용');
        } else {
            console.warn('[WebSocket Client] Electron API 없음 - 개발 모드에서는 기존 WebSocket 사용');
            // 개발 모드에서는 기존 websocket-manager 사용
            return;
        }
    }

    setupElectronListeners() {
        // WebSocket 연결 상태 이벤트
        window.electronAPI.onWebSocketConnected(() => {
            console.log('[WebSocket Client] 연결됨');
            this.emit('connected');
        });

        window.electronAPI.onWebSocketDisconnected(() => {
            console.log('[WebSocket Client] 연결 해제됨');
            this.emit('disconnected');
        });

        // WebSocket 메시지 수신
        window.electronAPI.onWebSocketMessage((event, message) => {
            this.handleMessage(message);
        });
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
     * 서버로 명령 전송
     */
    async sendCommand(command) {
        if (typeof window.electronAPI !== 'undefined') {
            try {
                const result = await window.electronAPI.sendWebSocketCommand(command);
                console.log('[WebSocket Client] 명령 전송:', command, '결과:', result);
                return result;
            } catch (error) {
                console.error('[WebSocket Client] 명령 전송 오류:', error);
                return false;
            }
        } else {
            console.warn('[WebSocket Client] Electron API 없음');
            return false;
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
     * 연결 상태 확인
     */
    async getConnectionStatus() {
        if (typeof window.electronAPI !== 'undefined') {
            try {
                const status = await window.electronAPI.getConnectionStatus();
                return {
                    websocket: status.connected,
                    motor: this.motorStatus.connected,
                    motorStatus: this.motorStatus
                };
            } catch (error) {
                console.error('[WebSocket Client] 상태 확인 오류:', error);
                return { websocket: false, motor: false, motorStatus: this.motorStatus };
            }
        } else {
            return { websocket: false, motor: false, motorStatus: this.motorStatus };
        }
    }

    /**
     * 연결 여부 확인 (동기)
     */
    get isConnected() {
        // 비동기 상태 확인은 getConnectionStatus() 사용
        return true; // Electron 메인 프로세스에서 관리하므로 항상 true로 가정
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
                    console.error(`[WebSocket Client] 이벤트 콜백 오류 (${event}):`, error);
                }
            });
        }
    }

    /**
     * 페이지 언로드 시 정리 (실제로는 연결 유지)
     */
    cleanup() {
        // Electron 메인 프로세스에서 연결을 관리하므로 실제 정리는 하지 않음
        console.log('[WebSocket Client] 페이지 언로드 - 연결은 유지됨');
    }
}

// 전역 WebSocket 클라이언트 인스턴스 생성
window.wsManager = new WebSocketClient();

// 하위 호환성을 위한 전역 함수들
window.connectWebSocket = () => console.log('WebSocket은 Electron 메인 프로세스에서 자동 관리됩니다.');
window.sendWebSocketCommand = (command) => window.wsManager.sendCommand(command);
window.getMotorStatus = () => window.wsManager.getConnectionStatus();

// 페이지 언로드 시 정리 (연결은 유지)
window.addEventListener('beforeunload', () => {
    window.wsManager.cleanup();
});

console.log('[WebSocket Client] 초기화 완료 - 지속적 연결 모드');
