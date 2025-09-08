import asyncio
import websockets
import json
import time
from motor_threaded_controller import MotorThreadedController
from rf_utils import (
    open_rf_port_util, close_rf_port_util, 
    send_rf_output_command_util, send_rf_shot_command_util,
    build_rf_shot_command, set_dtr_high_util
)
import serial

# EEPROM 관련 import
try:
    import smbus2
    eeprom_available = True
    print("[OK] EEPROM 기능 활성화 (smbus2)")
except ImportError:
    eeprom_available = False
    print("[ERROR] smbus2 모듈을 찾을 수 없습니다. EEPROM 기능이 비활성화됩니다.")

# EEPROM 설정
I2C_BUS = 1
MTR20_EEPROM_ADDRESS = 0x50
MTR20_CLASSYS_OFFSET = 0x10
MTR20_CUTERA_OFFSET = 0x80
MTR40_EEPROM_ADDRESS = 0x51
MTR40_OFFSET = 0x70

# --- [수정] GPIO 초기화 (gpiozero 라이브러리로 통합) ---
gpio_available = False
pin18 = None
pin23 = None # pin23 객체 추가
pin0 = None  # GPIO0 for RF DTR control
needle_tip_connected = False

# RF 연결 관련 변수
rf_connection = None
rf_connected = False

try:
    from gpiozero import DigitalInputDevice, Button, DigitalOutputDevice
    
    # GPIO18: 기존 DigitalInputDevice 유지
    pin18 = DigitalInputDevice(18)
    
    # GPIO23: Button 클래스로 변경 (내부 풀업, 바운스 타임 지원)
    pin23 = Button(23, pull_up=True, bounce_time=0.2)
    
    # GPIO0: RF DTR 제어용 출력 핀
    pin0 = DigitalOutputDevice(0)
    
    # 초기 니들팁 상태 설정 (is_pressed는 풀업 상태에서 LOW일 때 True)
    needle_tip_connected = pin23.is_pressed
    print(f"[GPIO23] 초기 니들팁 상태: {'연결됨' if needle_tip_connected else '분리됨'}")
    print(f"[GPIO0] RF DTR 핀 초기화 완료")

    # 니들팁 연결/해제 이벤트 핸들러 정의
    def _on_tip_connected():
        global needle_tip_connected
        needle_tip_connected = True
        print("[GPIO23] 니들팁 상태 변경: 연결됨")

    def _on_tip_disconnected():
        global needle_tip_connected
        needle_tip_connected = False
        print("[GPIO23] 니들팁 상태 변경: 분리됨")

    # 이벤트 핸들러 할당
    pin23.when_pressed = _on_tip_connected
    pin23.when_released = _on_tip_disconnected
    
    gpio_available = True
    print("[OK] GPIO 18/23 초기화 완료 (gpiozero 라이브러리)")

except ImportError as ie:
    print(f"[ERROR] GPIO 모듈을 찾을 수 없습니다: {ie}. GPIO 기능이 비활성화됩니다.")
except Exception as e:
    print(f"[ERROR] GPIO 초기화 오류: {e}")
# --- [여기까지 수정] ---

motor = MotorThreadedController()
connected_clients = set()

# 모터 자동 연결 시도
try:
    # 기본 설정으로 모터 연결 시도
    result = motor.connect('auto', 19200, 'none', 8, 1)
    if motor.is_connected():
        print(f"[MOTOR] 자동 연결 성공: {result}")
    else:
        print(f"[MOTOR] 자동 연결 실패: {result}")
except Exception as e:
    print(f"[MOTOR] 자동 연결 중 오류: {e}")

# RF 자동 연결 시도
try:
    rf_connection = serial.Serial(
        port='/dev/usb-rf',
        baudrate=19200,
        bytesize=8,
        stopbits=serial.STOPBITS_ONE,
        parity=serial.PARITY_NONE,
        timeout=1
    )
    rf_connected = True
    print(f"[RF] 자동 연결 성공: /dev/usb-rf")
    
    # RF 출력 설정 명령어 전송 (020901430100014903)
    setup_command = bytes.fromhex('020901430100014903')
    rf_connection.write(setup_command)
    print(f"[RF] 출력 설정 명령어 전송: {setup_command.hex().upper()}")
    
except Exception as e:
    rf_connected = False
    print(f"[RF] 자동 연결 실패: {e}")


# 모터 재연결 관련
motor_reconnect_task = None

# --- [삭제] RPi.GPIO용 gpio23_callback 함수 삭제 ---

# EEPROM 관련 함수들은 이전과 동일합니다.
def write_eeprom_mtr20(tip_type, shot_count, year, month, day, maker_code, country="CLASSYS"):
    if not eeprom_available: return {"success": False, "error": "EEPROM 기능 비활성화"}
    eeprom_address = MTR20_EEPROM_ADDRESS
    offset = MTR20_CUTERA_OFFSET if country == "CUTERA" else MTR20_CLASSYS_OFFSET
    try:
        bus = smbus2.SMBus(I2C_BUS)
        bus.write_byte_data(eeprom_address, offset + 0, tip_type); time.sleep(0.01)
        bus.write_byte_data(eeprom_address, offset + 1, (shot_count >> 8) & 0xFF); time.sleep(0.01)
        bus.write_byte_data(eeprom_address, offset + 2, shot_count & 0xFF); time.sleep(0.01)
        bus.write_byte_data(eeprom_address, offset + 9, (year - 2000) & 0xFF); time.sleep(0.01)
        bus.write_byte_data(eeprom_address, offset + 10, month & 0xFF); time.sleep(0.01)
        bus.write_byte_data(eeprom_address, offset + 11, day & 0xFF); time.sleep(0.01)
        bus.write_byte_data(eeprom_address, offset + 12, maker_code & 0xFF); time.sleep(0.01)
        bus.close()
        return {"success": True, "message": f"MTR 2.0 {country} EEPROM 쓰기 성공"}
    except Exception as e: return {"success": False, "error": f"EEPROM 쓰기 실패: {e}"}

def read_eeprom_mtr20(country="CLASSYS"):
    if not eeprom_available: return {"success": False, "error": "EEPROM 기능 비활성화"}
    eeprom_address = MTR20_EEPROM_ADDRESS
    offset = MTR20_CUTERA_OFFSET if country == "CUTERA" else MTR20_CLASSYS_OFFSET
    bus = None; max_retries = 3
    for attempt in range(max_retries):
        try:
            bus = smbus2.SMBus(I2C_BUS)
            tip_type = bus.read_byte_data(eeprom_address, offset + 0)
            shot = bus.read_i2c_block_data(eeprom_address, offset + 1, 2); shot_count = (shot[0] << 8) | shot[1]
            year_off = bus.read_byte_data(eeprom_address, offset + 9); month = bus.read_byte_data(eeprom_address, offset + 10); day = bus.read_byte_data(eeprom_address, offset + 11)
            year = 2000 + year_off
            maker_code = bus.read_byte_data(eeprom_address, offset + 12)
            return {"success": True, "tipType": tip_type, "shotCount": shot_count, "year": year, "month": month, "day": day, "makerCode": maker_code, "mtrVersion": "2.0", "country": country}
        except Exception as e:
            if attempt < max_retries - 1: time.sleep(0.1)
            else: return {"success": False, "error": f"EEPROM 읽기 실패: {e}"}
        finally:
            if bus is not None:
                try: bus.close()
                except: pass

def write_eeprom_mtr40(tip_type, shot_count, year, month, day, maker_code):
    if not eeprom_available: return {"success": False, "error": "EEPROM 기능 비활성화"}
    eeprom_address = MTR40_EEPROM_ADDRESS; offset = MTR40_OFFSET
    try:
        bus = smbus2.SMBus(I2C_BUS)
        bus.write_byte_data(eeprom_address, offset + 0, tip_type); time.sleep(0.01)
        bus.write_byte_data(eeprom_address, offset + 1, (shot_count >> 8) & 0xFF); time.sleep(0.01)
        bus.write_byte_data(eeprom_address, offset + 2, shot_count & 0xFF); time.sleep(0.01)
        bus.write_byte_data(eeprom_address, offset + 9, (year - 2000) & 0xFF); time.sleep(0.01)
        bus.write_byte_data(eeprom_address, offset + 10, month & 0xFF); time.sleep(0.01)
        bus.write_byte_data(eeprom_address, offset + 11, day & 0xFF); time.sleep(0.01)
        bus.write_byte_data(eeprom_address, offset + 12, maker_code & 0xFF); time.sleep(0.01)
        bus.close()
        return {"success": True, "message": f"MTR 4.0 EEPROM 쓰기 성공"}
    except Exception as e: return {"success": False, "error": f"EEPROM 쓰기 실패: {e}"}

def read_eeprom_mtr40():
    if not eeprom_available: return {"success": False, "error": "EEPROM 기능 비활성화"}
    eeprom_address = MTR40_EEPROM_ADDRESS; offset = MTR40_OFFSET
    bus = None; max_retries = 3
    for attempt in range(max_retries):
        try:
            bus = smbus2.SMBus(I2C_BUS)
            tip_type = bus.read_byte_data(eeprom_address, offset + 0)
            shot = bus.read_i2c_block_data(eeprom_address, offset + 1, 2); shot_count = (shot[0] << 8) | shot[1]
            year_off = bus.read_byte_data(eeprom_address, offset + 9); month = bus.read_byte_data(eeprom_address, offset + 10); day = bus.read_byte_data(eeprom_address, offset + 11)
            year = 2000 + year_off
            maker_code = bus.read_byte_data(eeprom_address, offset + 12)
            return {"success": True, "tipType": tip_type, "shotCount": shot_count, "year": year, "month": month, "day": day, "makerCode": maker_code, "mtrVersion": "4.0", "country": "ALL"}
        except Exception as e:
            if attempt < max_retries - 1: time.sleep(0.1)
            else: return {"success": False, "error": f"EEPROM 읽기 실패: {e}"}
        finally:
            if bus is not None:
                try: bus.close()
                except: pass

async def handler(websocket):
    print("[INFO] 클라이언트 연결됨")
    connected_clients.add(websocket)
    try:
        async for msg in websocket:
            try:
                data = json.loads(msg)
                # handler 함수 내부 로직은 이전과 동일
                # ...
                if data["cmd"] == "connect":
                    result = motor.connect(data.get("port"), data.get("baudrate"), data.get("parity"), data.get("databits"), data.get("stopbits"))
                    await websocket.send(json.dumps({"type": "serial", "result": result}))
                elif data["cmd"] == "disconnect":
                    result = motor.disconnect()
                    await websocket.send(json.dumps({"type": "serial", "result": result}))
                elif data["cmd"] == "move":
                    result = motor.move_to_position(data.get("position"), data.get("mode", "position"))
                    await websocket.send(json.dumps({"type": "serial", "result": result}))
                elif data["cmd"] == "eeprom_write":
                    mtr_version = data.get("mtrVersion", "2.0"); country = data.get("country")
                    if mtr_version == "4.0":
                        result = write_eeprom_mtr40(data.get("tipType"), data.get("shotCount", 0), data.get("year"), data.get("month"), data.get("day"), data.get("makerCode"))
                    else:
                        result = write_eeprom_mtr20(data.get("tipType"), data.get("shotCount", 0), data.get("year"), data.get("month"), data.get("day"), data.get("makerCode"), country)
                    if result.get("success"):
                        read_result = read_eeprom_mtr40() if mtr_version == "4.0" else read_eeprom_mtr20(country)
                        if read_result.get("success"): result["data"] = read_result
                    await websocket.send(json.dumps({"type": "eeprom_write", "result": result}))
                elif data["cmd"] == "eeprom_read":
                    mtr_version = data.get("mtrVersion", "2.0"); country = data.get("country")
                    result = read_eeprom_mtr40() if mtr_version == "4.0" else read_eeprom_mtr20(country)
                    await websocket.send(json.dumps({"type": "eeprom_read", "result": result}))
                elif data["cmd"] == "rf_shot":
                    # RF 샷 명령 처리
                    if rf_connected and rf_connection:
                        intensity = data.get("intensity", 50)  # INTENSITY 값 (기본값 50%)
                        rf_time = data.get("rf_time", 60)      # RF 시간 값 (기본값 60ms)
                        
                        # 1MHz 고정, level과 ontime은 같은 값으로 설정
                        frame = build_rf_shot_command(
                            rf_1MHz_checked=True,
                            rf_2MHz_checked=False, 
                            level_val=intensity,
                            ontime_val=rf_time
                        )
                        
                        rf_connection.write(frame)
                        print(f"[RF] 샷 명령 전송: 1MHz, Level:{intensity}, OnTime:{rf_time}ms")
                        await websocket.send(json.dumps({"type": "rf_shot", "result": "RF 샷 명령 전송 완료"}))
                    else:
                        await websocket.send(json.dumps({"type": "rf_shot", "result": "RF 연결되지 않음"}))
                elif data["cmd"] == "rf_dtr_high":
                    # RF DTR HIGH 명령 처리 (GPIO0 제어)
                    if gpio_available and pin0:
                        rf_time = data.get("rf_time", 60)  # RF 시간 값 (ms)
                        
                        # DTR HIGH 설정
                        pin0.on()
                        print(f"[GPIO0] DTR HIGH 설정 ({rf_time}ms)")
                        
                        # 지정된 시간만큼 대기 후 LOW로 변경
                        await asyncio.sleep(rf_time / 1000.0)  # ms를 초로 변환
                        
                        pin0.off()
                        print(f"[GPIO0] DTR LOW 설정")
                        
                        await websocket.send(json.dumps({"type": "rf_dtr_high", "result": f"DTR {rf_time}ms 동안 HIGH 설정 완료"}))
                    else:
                        await websocket.send(json.dumps({"type": "rf_dtr_high", "result": "GPIO 사용 불가"}))
                else:
                    await websocket.send(json.dumps({"type": "error", "result": "알 수 없는 명령어"}))
            except Exception as e:
                print(f"[ERROR] 처리 중 에러: {str(e)}")
                await websocket.send(json.dumps({"type": "error", "result": str(e)}))
    finally:
        connected_clients.discard(websocket)
        print("[INFO] 클라이언트 연결 해제됨")

async def check_and_reconnect_motor():
    max_motor_retries = 3
    if not motor.is_connected():
        print("[MOTOR] 연결 끊어짐, 재연결 시도...")
        for i in range(max_motor_retries):
            try:
                # 안전 종료
                if hasattr(motor, 'disconnect'):
                    motor.disconnect()
                await asyncio.sleep(1.0)

                # 재시도: 반드시 connect 호출
                result = motor.connect('auto', 19200, 'none', 8, 1)
                print(f"[MOTOR] 재연결 시도 {i+1}: {result}")
                if motor.is_connected():
                    print(f"[MOTOR] 재연결 성공 (시도 {i+1})")
                    return True
            except Exception as e:
                print(f"[MOTOR] 재연결 실패 {i+1}: {e}")
        print("[MOTOR] 최대 재시도 횟수 초과")
        return False
    return True


async def push_motor_status():
    global motor_reconnect_task
    while True:
        await asyncio.sleep(0.05)
        
        motor_connected = motor.is_connected()
        if not motor_connected and (motor_reconnect_task is None or motor_reconnect_task.done()):
            motor_reconnect_task = asyncio.create_task(check_and_reconnect_motor())

        
        data = {}
        # GPIO 상태 읽기
        gpio18_state = "UNKNOWN"; gpio23_state = "UNKNOWN"
        if gpio_available:
            if pin18:
                gpio18_state = "HIGH" if pin18.value else "LOW"
            # --- [수정] gpiozero 객체 속성으로 상태 읽기 ---
            if pin23:
                # is_pressed가 True이면 LOW 상태(연결됨), False이면 HIGH 상태(분리됨)
                gpio23_state = "LOW" if pin23.is_pressed else "HIGH"

        if motor_connected:
            data = {
                "type": "status",
                "data": {
                    "position": motor.position, "force": motor.force, "sensor": motor.sensor, "setPos": motor.setPos,
                    "gpio18": gpio18_state, "gpio23": gpio23_state,
                    "needle_tip_connected": needle_tip_connected,
                    "motor_connected": True,
                    "rf_connected": rf_connected,
                }
            }
        else:
            data = {
                "type": "status",
                "data": {
                    "motor_connected": False,
                    "gpio18": gpio18_state, "gpio23": gpio23_state,
                    "needle_tip_connected": needle_tip_connected,
                    "rf_connected": rf_connected,
                }
            }

        for ws in connected_clients.copy():
            try:
                await ws.send(json.dumps(data))
            except Exception as e:
                print(f"[WARN] 상태 전송 실패: {e}")
                connected_clients.discard(ws)

async def main():
    async with websockets.serve(handler, "0.0.0.0", 8765):
        print("[INFO] WebSocket 모터 서버 실행 중 (ws://0.0.0.0:8765)")
        await push_motor_status()

def cleanup_gpio():
    # --- [수정] gpiozero 객체 정리 ---
    if gpio_available:
        try:
            if pin18: pin18.close()
            if pin23: pin23.close()
            if pin0: pin0.close()
            print("[OK] GPIO 리소스 정리 완료")
        except Exception as e:
            print(f"[ERROR] GPIO 정리 오류: {e}")
    
    # RF 연결 정리
    if rf_connection and rf_connection.is_open:
        try:
            rf_connection.close()
            print("[OK] RF 연결 정리 완료")
        except Exception as e:
            print(f"[ERROR] RF 정리 오류: {e}")
    # --- [여기까지 수정] ---

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[INFO] 프로그램 종료 중...")
    finally:
        cleanup_gpio()