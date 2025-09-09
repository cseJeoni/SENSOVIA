# eprom_utils.py

import smbus2
import time

def read_eeprom_data(i2c_bus, device_address, start_address):
    """
    EEPROM 데이터를 읽어 딕셔너리 형태로 반환
    """
    try:
        print(f"[EEPROM_UTILS] read_eeprom_data 호출")
        print(f"[EEPROM_UTILS] 파라미터: bus={i2c_bus}, addr=0x{device_address:02X}, start=0x{start_address:02X}")
        
        bus = smbus2.SMBus(i2c_bus)

        # 데이터 읽기
        tip_type = bus.read_byte_data(device_address, start_address + 0x00)
        print(f"[EEPROM_UTILS] TIP TYPE 읽기: 주소 0x{start_address + 0x00:02X} = {tip_type}")
        
        shot_count_bytes = bus.read_i2c_block_data(device_address, start_address + 0x01, 2)
        shot_count = (shot_count_bytes[0] << 8) | shot_count_bytes[1]
        print(f"[EEPROM_UTILS] Shot Count 읽기: 주소 0x{start_address + 0x01:02X} = {shot_count_bytes} -> {shot_count}")

        # 제조일자 읽기 (1바이트 연도, 1바이트 월, 1바이트 일)
        date_bytes = bus.read_i2c_block_data(device_address, start_address + 0x19, 3)
        year_byte = date_bytes[0]
        year = 2000 + year_byte if year_byte < 100 else 1900 + year_byte
        month = date_bytes[1]
        day = date_bytes[2]
        print(f"[EEPROM_UTILS] 제조일자 읽기: 주소 0x{start_address + 0x19:02X} = {date_bytes} -> {year}-{month:02d}-{day:02d}")

        manufacturer = bus.read_byte_data(device_address, start_address + 0x1C)
        print(f"[EEPROM_UTILS] Manufacturer 읽기: 주소 0x{start_address + 0x1C:02X} = {manufacturer}")

        bus.close()

        # 결과 반환
        result = {
            "tip_type": tip_type,
            "shot_count": shot_count,
            "manufacture_date": f"{year:04d}-{month:02d}-{day:02d}",
            "manufacturer": manufacturer,
        }
        print(f"[EEPROM_UTILS] 읽기 결과: {result}")
        return result

    except Exception as e:
        print(f"[EEPROM_UTILS] EEPROM 읽기 오류: {e}")
        raise RuntimeError(f"Failed to read EEPROM data: {e}")






def write_eeprom_data(
    i2c_bus,  # 매개변수 이름은 그대로 유지
    device_address,
    start_address,
    tip_type,
    shot_count,
    manufacture_date,
    manufacturer
):
    try:
        print(f"[EEPROM_UTILS] write_eeprom_data 호출")
        print(f"[EEPROM_UTILS] 파라미터: bus={i2c_bus}, addr=0x{device_address:02X}, start=0x{start_address:02X}")
        print(f"[EEPROM_UTILS] tip_type={tip_type}, shot_count={shot_count}, manufacturer={manufacturer}")
        print(f"[EEPROM_UTILS] manufacture_date={manufacture_date}")
        
        bus = smbus2.SMBus(i2c_bus)  # i2c_bus를 사용
        
        # TIP TYPE 쓰기
        print(f"[EEPROM_UTILS] TIP TYPE 쓰기: 주소 0x{start_address + 0x00:02X} = {tip_type}")
        bus.write_byte_data(device_address, start_address + 0x00, tip_type)
        time.sleep(0.1)

        # Shot Count 쓰기 (Big Endian)
        shot_count_bytes = [shot_count >> 8, shot_count & 0xFF]
        print(f"[EEPROM_UTILS] Shot Count 쓰기: 주소 0x{start_address + 0x01:02X} = {shot_count_bytes} (값: {shot_count})")
        bus.write_i2c_block_data(device_address, start_address + 0x01, shot_count_bytes)
        time.sleep(0.1)

        # 제조일자 쓰기
        date_bytes = [
            manufacture_date["year"] - 2000,
            manufacture_date["month"],
            manufacture_date["day"]
        ]
        print(f"[EEPROM_UTILS] 제조일자 쓰기: 주소 0x{start_address + 0x19:02X} = {date_bytes}")
        bus.write_i2c_block_data(device_address, start_address + 0x19, date_bytes)
        time.sleep(0.1)

        # Manufacturer 쓰기
        print(f"[EEPROM_UTILS] Manufacturer 쓰기: 주소 0x{start_address + 0x1C:02X} = {manufacturer}")
        bus.write_byte_data(device_address, start_address + 0x1C, manufacturer)
        time.sleep(0.1)

        bus.close()
        print(f"[EEPROM_UTILS] EEPROM 쓰기 완료")
    except Exception as e:
        print(f"[EEPROM_UTILS] EEPROM 쓰기 오류: {e}")
        raise RuntimeError(f"Failed to write EEPROM data: {e}")




