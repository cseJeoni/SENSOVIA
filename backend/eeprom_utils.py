# eprom_utils.py

import smbus2
import time

def read_eeprom_data(i2c_bus, device_address, start_address):
    """
    EEPROM 데이터를 읽어 딕셔너리 형태로 반환
    """
    try:
        bus = smbus2.SMBus(i2c_bus)

        # 데이터 읽기
        tip_type = bus.read_byte_data(device_address, start_address + 0x00)
        shot_count_bytes = bus.read_i2c_block_data(device_address, start_address + 0x01, 2)
        shot_count = (shot_count_bytes[0] << 8) | shot_count_bytes[1]

        # 제조일자 읽기 (1바이트 연도, 1바이트 월, 1바이트 일)
        date_bytes = bus.read_i2c_block_data(device_address, start_address + 0x19, 3)
        year_byte = date_bytes[0]
        year = 2000 + year_byte if year_byte < 100 else 1900 + year_byte
        month = date_bytes[1]
        day = date_bytes[2]

        manufacturer = bus.read_byte_data(device_address, start_address + 0x1C)

        bus.close()

        # 결과 반환
        return {
            "tip_type": tip_type,
            "shot_count": shot_count,
            "manufacture_date": f"{year:04d}-{month:02d}-{day:02d}",
            "manufacturer": manufacturer,
        }

    except Exception as e:
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
        bus = smbus2.SMBus(i2c_bus)  # i2c_bus를 사용
        # TIP TYPE 쓰기
        bus.write_byte_data(device_address, start_address + 0x00, tip_type)
        time.sleep(0.1)

        # Shot Count 쓰기
        shot_count_bytes = [shot_count >> 8, shot_count & 0xFF]
        bus.write_i2c_block_data(device_address, start_address + 0x01, shot_count_bytes)
        time.sleep(0.1)

        # 제조일자 쓰기
        date_bytes = [
            manufacture_date["year"] - 2000,
            manufacture_date["month"],
            manufacture_date["day"]
        ]
        bus.write_i2c_block_data(device_address, start_address + 0x19, date_bytes)
        time.sleep(0.1)

        # Manufacturer 쓰기
        bus.write_byte_data(device_address, start_address + 0x1C, manufacturer)
        time.sleep(0.1)

        bus.close()
    except Exception as e:
        raise RuntimeError(f"Failed to write EEPROM data: {e}")




