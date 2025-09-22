import asyncio
import websockets
import json
import time
import queue
import threading
from motor_threaded_controller import MotorThreadedController
from rf_utils import (
    open_rf_port_util, close_rf_port_util, 
    send_rf_output_command_util, send_rf_shot_command_util,
    build_rf_shot_command, set_dtr_high_util
)
from eeprom_utils import read_eeprom_data, write_eeprom_data
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

# --- GPIO 초기화 (gpiozero 라이브러리) ---
gpio_available = False
pin0 = None  # GPIO0 for RF DTR control
pin12 = None # GPIO12 for foot switch (풋 스위치)

# RF 연결 관련 변수
rf_connection = None
rf_connected = False

# 풋 스위치 이벤트 큐
foot_switch_queue = queue.Queue()

try:
    from gpiozero import Button, DigitalOutputDevice
    
    # GPIO0: RF DTR 제어용 출력 핀
    pin0 = DigitalOutputDevice(0)
    
    # GPIO12: 풋 스위치용 (풀다운 설정, 바운스 타임 지원)
    pin12 = Button(12, pull_up=False, bounce_time=0.2)
    
    # GPIO17: 니들팁 커넥트 핀 (풀다운 설정, 인터럽트 방식)
    pin17 = Button(17, pull_up=False, bounce_time=0.1)
    
    # GPIO22: LED 출력 (니들팁 연결됨 표시)
    pin22 = DigitalOutputDevice(22)
    
    # GPIO27: LED 출력 (니들팁 분리됨 표시)
    pin27 = DigitalOutputDevice(27)
    
    # GPIO17 인터럽트 이벤트 핸들러
    def _on_needle_tip_connected():
        print("[GPIO17] 니들팁 연결 인터럽트 발생")
        pin22.on()   # GPIO22 LED ON
        pin27.off()  # GPIO27 LED OFF
        print("[GPIO17] 니들팁 연결됨 - GPIO22 LED ON")
        
        # 모든 연결된 클라이언트에게 GPIO17 상태 변경 알림
        gpio17_event = {
            "type": "gpio17_status",
            "data": {
                "gpio17": "HIGH",
                "needle_tip_connected": True
            }
        }
        for ws in connected_clients.copy():
            try:
                asyncio.create_task(ws.send(json.dumps(gpio17_event)))
            except Exception as e:
                print(f"[WARN] GPIO17 상태 전송 실패: {e}")
                connected_clients.discard(ws)
    
    def _on_needle_tip_disconnected():
        print("[GPIO17] 니들팁 분리 인터럽트 발생")
        pin22.off()  # GPIO22 LED OFF
        pin27.on()   # GPIO27 LED ON
        print("[GPIO17] 니들팁 분리됨 - GPIO27 LED ON")
        
        # 모든 연결된 클라이언트에게 GPIO17 상태 변경 알림
        gpio17_event = {
            "type": "gpio17_status",
            "data": {
                "gpio17": "LOW",
                "needle_tip_connected": False
            }
        }
        for ws in connected_clients.copy():
            try:
                asyncio.create_task(ws.send(json.dumps(gpio17_event)))
            except Exception as e:
                print(f"[WARN] GPIO17 상태 전송 실패: {e}")
                connected_clients.discard(ws)
    
    # GPIO17 상태에 따른 LED 제어 함수
    def update_needle_tip_leds():
        if pin17.is_pressed:  # GPIO17이 HIGH (Button 클래스에서는 is_pressed 사용)
            pin22.on()   # GPIO22 LED ON
            pin27.off()  # GPIO27 LED OFF
            print("[GPIO17] 니들팁 연결됨 - GPIO22 LED ON")
        else:  # GPIO17이 LOW
            pin22.off()  # GPIO22 LED OFF
            pin27.on()   # GPIO27 LED ON
            print("[GPIO17] 니들팁 분리됨 - GPIO27 LED ON")
    
    # RF 샷 중 LED 깜빡임 함수
    async def blink_leds_during_rf_shot(rf_time_ms):
        """RF 샷 지속 시간 동안 GPIO22(파란색)와 GPIO27(빨간색) LED를 번갈아 깜빡임"""
        print(f"[LED] RF 샷 LED 깜빡임 시작 ({rf_time_ms}ms)")
        
        # 현재 LED 상태 저장
        original_pin22_state = pin22.value
        original_pin27_state = pin27.value
        
        # RF 샷 시간을 100ms 단위로 나누어 깜빡임
        blink_interval = 0.1  # 100ms
        total_time = rf_time_ms / 1000.0  # ms를 초로 변환
        elapsed_time = 0
        led_state = True  # True: GPIO22 ON, GPIO27 OFF
        
        try:
            while elapsed_time < total_time:
                if led_state:
                    pin22.on()   # 파란색 LED ON
                    pin27.off()  # 빨간색 LED OFF
                else:
                    pin22.off()  # 파란색 LED OFF
                    pin27.on()   # 빨간색 LED ON
                
                led_state = not led_state  # 상태 토글
                await asyncio.sleep(blink_interval)
                elapsed_time += blink_interval
        
        finally:
            # 원래 LED 상태로 복원
            if original_pin22_state:
                pin22.on()
            else:
                pin22.off()
            
            if original_pin27_state:
                pin27.on()
            else:
                pin27.off()
            
            print(f"[LED] RF 샷 LED 깜빡임 완료, 원래 상태로 복원")
    
    # 초기 LED 상태 설정
    update_needle_tip_leds()
    print(f"[GPIO0] RF DTR 핀 초기화 완료")
    print(f"[GPIO12] 풋 스위치 초기화 완료 (풀다운 설정)")
    print(f"[GPIO12] 초기 풋 스위치 상태: {'HIGH' if pin12.is_pressed else 'LOW'}")

    # 풋 스위치 이벤트 핸들러 정의 (동기 함수로 변경)
    def _on_foot_switch_pressed_sync():
        print("=" * 50)
        print("[GPIO12] 풋 스위치 눌림 감지!")
        print("[GPIO12] 이벤트 큐에 신호 추가")
        
        # 큐에 풋 스위치 이벤트 추가
        foot_switch_data = {
            "type": "foot_switch",
            "data": {
                "pressed": True,
                "timestamp": time.time()
            }
        }
        
        try:
            foot_switch_queue.put_nowait(foot_switch_data)
            print("[GPIO12] 풋 스위치 이벤트 큐에 추가 완료")
        except queue.Full:
            print("[WARN] 풋 스위치 이벤트 큐가 가득참")
        
        print("=" * 50)
    
    def _on_foot_switch_released_sync():
        print("[GPIO12] 풋 스위치 released 인터럽트 발생")

    # 이벤트 핸들러 할당
    pin12.when_pressed = _on_foot_switch_pressed_sync
    pin12.when_released = _on_foot_switch_released_sync
    pin17.when_pressed = _on_needle_tip_connected
    pin17.when_released = _on_needle_tip_disconnected
    
    # 풋 스위치 이벤트 핸들러가 제대로 등록되었는지 확인
    print(f"[GPIO12] 이벤트 핸들러 등록 확인:")
    print(f"[GPIO12] when_pressed: {pin12.when_pressed}")
    print(f"[GPIO12] when_released: {pin12.when_released}")
    
    gpio_available = True
    print("[OK] GPIO 0/12/17/22/27 초기화 완료 (gpiozero 라이브러리)")
    print(f"[GPIO17] 니들팁 커넥트 핀 초기화 완료 (풀다운, 인터럽트 방식)")
    print(f"[GPIO17] 초기 니들팁 커넥트 상태: {'HIGH' if pin17.is_pressed else 'LOW'}")
    print(f"[GPIO22] LED 출력 핀 초기화 완료 (니들팁 연결 표시)")
    print(f"[GPIO27] LED 출력 핀 초기화 완료 (니들팁 분리 표시)")
    print(f"[GPIO17] 이벤트 핸들러 등록 확인:")
    print(f"[GPIO17] when_pressed: {pin17.when_pressed}")
    print(f"[GPIO17] when_released: {pin17.when_released}")

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
                elif data["cmd"] == "eeprom_read":
                    try:
                        if eeprom_available:
                            eeprom_data = read_eeprom_data(I2C_BUS, 0x50, 0x10)
                            result = {"success": True, "data": eeprom_data}
                        else:
                            result = {"success": False, "error": "EEPROM 기능 사용 불가"}
                    except Exception as e:
                        result = {"success": False, "error": str(e)}
                    await websocket.send(json.dumps({"type": "eeprom_read", "result": result}))
                elif data["cmd"] == "eeprom_write":
                    try:
                        if eeprom_available:
                            tip_type = data.get("tip_type", 64)
                            shot_count = data.get("shot_count", 0)
                            manufacture_date = data.get("manufacture_date", {"year": 2024, "month": 1, "day": 1})
                            manufacturer = data.get("manufacturer", 1)
                            
                            write_eeprom_data(I2C_BUS, 0x50, 0x10, tip_type, shot_count, manufacture_date, manufacturer)
                            result = {"success": True, "message": "EEPROM 쓰기 완료"}
                        else:
                            result = {"success": False, "error": "EEPROM 기능 사용 불가"}
                    except Exception as e:
                        result = {"success": False, "error": str(e)}
                    await websocket.send(json.dumps({"type": "eeprom_write", "result": result}))
                elif data["cmd"] == "shot_increment":
                    try:
                        print(f"[EEPROM] shot_increment 명령 수신")
                        print(f"[EEPROM] eeprom_available: {eeprom_available}")
                        
                        if eeprom_available:
                            try:
                                # I2C 버스 재초기화 시도
                                import smbus2
                                bus = smbus2.SMBus(I2C_BUS)
                                
                                # EEPROM 연결 테스트
                                test_read = bus.read_byte_data(0x50, 0x10)
                                print(f"[EEPROM] I2C 연결 테스트 성공: {test_read}")
                                bus.close()
                                
                                # 현재 EEPROM 데이터 읽기
                                print(f"[EEPROM] 현재 데이터 읽기 시작 - I2C_BUS: {I2C_BUS}, Address: 0x50, Offset: 0x10")
                                current_data = read_eeprom_data(I2C_BUS, 0x50, 0x10)
                                print(f"[EEPROM] 현재 데이터: {current_data}")
                                
                                # shotCount 증가
                                old_shot_count = current_data["shot_count"]
                                new_shot_count = old_shot_count + 1
                                print(f"[EEPROM] shotCount 증가: {old_shot_count} -> {new_shot_count}")
                                
                                # EEPROM에 업데이트된 shotCount 쓰기
                                manufacture_date_parts = current_data["manufacture_date"].split("-")
                                manufacture_date = {
                                    "year": int(manufacture_date_parts[0]),
                                    "month": int(manufacture_date_parts[1]),
                                    "day": int(manufacture_date_parts[2])
                                }
                                print(f"[EEPROM] 제조일자: {manufacture_date}")
                                
                                print(f"[EEPROM] EEPROM 쓰기 시작...")
                                write_eeprom_data(
                                    I2C_BUS, 0x50, 0x10,
                                    current_data["tip_type"],
                                    new_shot_count,
                                    manufacture_date,
                                    current_data["manufacturer"]
                                )
                                print(f"[EEPROM] EEPROM 쓰기 완료")
                                
                                # 쓰기 완료 후 잠시 대기
                                import time
                                time.sleep(0.1)
                                
                                # 업데이트된 데이터 다시 읽기
                                print(f"[EEPROM] 업데이트된 데이터 다시 읽기...")
                                updated_data = read_eeprom_data(I2C_BUS, 0x50, 0x10)
                                print(f"[EEPROM] 업데이트된 데이터: {updated_data}")
                                
                                result = {"success": True, "data": updated_data}
                                
                            except OSError as oe:
                                if oe.errno == 121:  # Remote I/O error
                                    print(f"[EEPROM] I2C 통신 오류 (Errno 121): EEPROM이 연결되지 않았거나 I2C 버스에 문제가 있습니다.")
                                    result = {"success": False, "error": "EEPROM I2C 통신 오류: 하드웨어 연결을 확인하세요"}
                                else:
                                    print(f"[EEPROM] I2C OSError: {oe}")
                                    result = {"success": False, "error": f"I2C 오류: {str(oe)}"}
                        else:
                            print(f"[EEPROM] EEPROM 기능 사용 불가")
                            result = {"success": False, "error": "EEPROM 기능 사용 불가"}
                    except Exception as e:
                        print(f"[EEPROM] shot_increment 오류: {str(e)}")
                        import traceback
                        traceback.print_exc()
                        result = {"success": False, "error": str(e)}
                    await websocket.send(json.dumps({"type": "shot_increment", "result": result}))
                elif data["cmd"] == "rf_shot":
                    # RF 샷 명령 처리
                    if rf_connected and rf_connection:
                        intensity = data.get("intensity", 50)  # INTENSITY 값 (기본값 50%)
                        rf_time = data.get("rf_time", 60)      # RF 시간 값 (기본값 60ms)
                        
                        # RF 샷 중 LED 깜빡임 시작
                        if gpio_available and pin22 and pin27:
                            asyncio.create_task(blink_leds_during_rf_shot(rf_time))
                        
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
                elif data["cmd"] == "get_gpio17_status":
                    # 초기 GPIO17 상태 확인 (연결 시 한 번만)
                    if gpio_available and pin17:
                        gpio17_state = "HIGH" if pin17.is_pressed else "LOW"
                        needle_tip_connected = pin17.is_pressed
                        
                        gpio17_event = {
                            "type": "gpio17_status",
                            "data": {
                                "gpio17": gpio17_state,
                                "needle_tip_connected": needle_tip_connected
                            }
                        }
                        await websocket.send(json.dumps(gpio17_event))
                        print(f"[GPIO17] 초기 상태 전송: {gpio17_state}")
                    else:
                        await websocket.send(json.dumps({"type": "gpio17_status", "data": {"gpio17": "UNKNOWN", "needle_tip_connected": False}}))
                elif data["cmd"] == "rf_dtr_high":
                    # RF DTR HIGH 명령 처리 (GPIO0 제어)
                    if gpio_available and pin0:
                        rf_time = data.get("rf_time", 60)  # RF 시간 값 (ms)
                        
                        # RF 샷 중 LED 깜빡임 시작
                        if gpio_available and pin22 and pin27:
                            asyncio.create_task(blink_leds_during_rf_shot(rf_time))
                        
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
        
        # 풋 스위치 이벤트 큐 처리
        try:
            while not foot_switch_queue.empty():
                foot_switch_data = foot_switch_queue.get_nowait()
                print(f"[GPIO12] 큐에서 풋 스위치 이벤트 처리: {json.dumps(foot_switch_data)}")
                print(f"[GPIO12] 연결된 클라이언트 수: {len(connected_clients)}")
                
                success_count = 0
                for ws in connected_clients.copy():
                    try:
                        await ws.send(json.dumps(foot_switch_data))
                        success_count += 1
                        print(f"[GPIO12] 클라이언트에게 신호 전송 성공 ({success_count})")
                    except Exception as e:
                        print(f"[WARN] 풋 스위치 신호 전송 실패: {e}")
                        connected_clients.discard(ws)
                
                print(f"[GPIO12] 총 {success_count}개 클라이언트에게 신호 전송 완료")
        except queue.Empty:
            pass
        
        motor_connected = motor.is_connected()
        if not motor_connected and (motor_reconnect_task is None or motor_reconnect_task.done()):
            motor_reconnect_task = asyncio.create_task(check_and_reconnect_motor())

        
        data = {}
        if motor_connected:
            data = {
                "type": "status",
                "data": {
                    "position": motor.position, "force": motor.force, "sensor": motor.sensor, "setPos": motor.setPos,
                    "motor_connected": True,
                    "rf_connected": rf_connected,
                }
            }
        else:
            data = {
                "type": "status",
                "data": {
                    "motor_connected": False,
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
    # --- gpiozero 객체 정리 ---
    if gpio_available:
        try:
            if pin0: pin0.close()
            if pin12: pin12.close()
            if pin17: pin17.close()
            if pin22: pin22.close()
            if pin27: pin27.close()
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