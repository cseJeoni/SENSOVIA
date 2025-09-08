import time
from time import perf_counter

"""
RF 관련 프레임 빌더 + 시리얼 포트 열기/닫기, 명령 전송 등을
UI 레퍼런스(텍스트창 등)를 인자로 받아 처리하는 방식 예시.
"""


def build_rf_command(command_type: str) -> bytes:
    if command_type == "status":
        cmd_hex = "02070141004503"
    elif command_type == "firmware":
        cmd_hex = "02070142004603"
    else:
        cmd_hex = "02070141004503"
    return bytes.fromhex(cmd_hex)


def build_rf_output_command(command_val: int, data: bytes) -> bytes:
    start = 0x02
    id_val = 0x01
    command_field = command_val

    if len(data) == 0:
        data_bytes = bytes([0x00])
    else:
        data_bytes = data

    length = 6 + len(data_bytes)
    checksum = start ^ length ^ id_val ^ command_field
    for b in data_bytes:
        checksum ^= b

    exit_val = 0x03
    frame = bytes([start, length, id_val, command_field]) + data_bytes + bytes([checksum, exit_val])
    return frame


def build_rf_shot_command(rf_1MHz_checked, rf_2MHz_checked, level_val, ontime_val) -> bytes:
    start = 0x02
    length = 15   # 1+1+1+1+9+1+1
    id_val = 0x01
    command_val = 0x44

    if rf_1MHz_checked:
        freq_flag = 0x00
        level_bytes = level_val.to_bytes(2, byteorder='big', signed=False)
        time_val = ontime_val * 10
        time_bytes = time_val.to_bytes(2, byteorder='big', signed=False)
        data_bytes = level_bytes + time_bytes + bytes([0, 0, 0, 0]) + bytes([freq_flag])
    elif rf_2MHz_checked:
        freq_flag = 0x01
        level_bytes = level_val.to_bytes(2, byteorder='big', signed=False)
        time_val = ontime_val * 10
        time_bytes = time_val.to_bytes(2, byteorder='big', signed=False)
        data_bytes = bytes([0, 0, 0, 0]) + level_bytes + time_bytes + bytes([freq_flag])
    else:
        data_bytes = bytes(9)

    checksum = start ^ length ^ id_val ^ command_val
    for b in data_bytes:
        checksum ^= b

    exit_val = 0x03
    frame = bytes([start, length, id_val, command_val]) + data_bytes + bytes([checksum, exit_val])
    return frame


# -------------------------
# RF 포트 열기 / 닫기
# -------------------------
def open_rf_port_util(
    serial_connection_rf,
    port, baudrate, bytesize, stopbits, parity,
    txtEdit_rf_resmsg
):
    import serial
    if serial_connection_rf and serial_connection_rf.is_open:
        serial_connection_rf.close()

    new_conn = serial.Serial(
        port=port,
        baudrate=baudrate,
        bytesize=bytesize,
        stopbits=stopbits,
        parity=parity,
        timeout=1
    )
    txtEdit_rf_resmsg.append(f"RF Port {port} opened.")
    return new_conn


def close_rf_port_util(serial_connection_rf, txtEdit_rf_resmsg):
    if serial_connection_rf and serial_connection_rf.is_open:
        serial_connection_rf.close()
    txtEdit_rf_resmsg.append("RF port closed.")
    return None


# -------------------------
# RF 명령 전송 로직
# -------------------------
def send_rf_command_util(
    serial_connection_rf,
    command_type,
    txtEdit_rf_sendmsg,
    txtEdit_rf_resmsg
):
    if not (serial_connection_rf and serial_connection_rf.is_open):
        txtEdit_rf_resmsg.append("RF port is not open.")
        return

    try:
        cmd = build_rf_command(command_type)
        txtEdit_rf_sendmsg.append(f"Sent: {cmd.hex().upper()}")
        serial_connection_rf.write(cmd)
        time.sleep(0.05)
        incoming = serial_connection_rf.read_all()
        if incoming:
            txtEdit_rf_resmsg.append(f"Received: {incoming.hex().upper()}")
        else:
            txtEdit_rf_resmsg.append("No response.")
    except Exception as e:
        txtEdit_rf_resmsg.append(f"Failed to send RF command: {e}")


def send_rf_output_command_util(
    serial_connection_rf,
    command_val,
    data,
    txtEdit_rf_sendmsg,
    txtEdit_rf_resmsg
):
    if not (serial_connection_rf and serial_connection_rf.is_open):
        txtEdit_rf_resmsg.append("RF port is not open.")
        return

    try:
        frame = build_rf_output_command(command_val, data)
        txtEdit_rf_sendmsg.append(f"Sent: {frame.hex().upper()}")
        serial_connection_rf.write(frame)
        time.sleep(0.05)
        incoming = serial_connection_rf.read_all()
        if incoming:
            txtEdit_rf_resmsg.append(f"Received: {incoming.hex().upper()}")
        else:
            txtEdit_rf_resmsg.append("No response.")
    except Exception as e:
        txtEdit_rf_resmsg.append(f"Failed to send RF output command: {e}")


def send_rf_shot_command_util(
    serial_connection_rf,
    rf_1MHz_checked,
    rf_2MHz_checked,
    level_val,
    limitTime_val,
    txtEdit_rf_sendmsg,
    txtEdit_rf_resmsg
):
    if not (serial_connection_rf and serial_connection_rf.is_open):
        txtEdit_rf_resmsg.append("RF port is not open.")
        return

    try:
        frame = build_rf_shot_command(rf_1MHz_checked, rf_2MHz_checked, level_val, limitTime_val)
        status_info = f"1MHz:{rf_1MHz_checked}, 2MHz:{rf_2MHz_checked}, Level:{level_val}, OnTime:{limitTime_val}"
        txtEdit_rf_sendmsg.append(f"Sent: {frame.hex().upper()} | {status_info}")

        serial_connection_rf.write(frame)
        time.sleep(0.05)
        incoming = serial_connection_rf.read_all()
        if incoming:
            txtEdit_rf_resmsg.append(f"Received: {incoming.hex().upper()}")
        else:
            txtEdit_rf_resmsg.append("No response.")
    except Exception as e:
        txtEdit_rf_resmsg.append(f"Failed to send RF shot output command: {e}")


def set_dtr_high_util(
    serial_connection_rf,
    txtEdit_rf_onTime,
    txtEdit_rf_resmsg,
    pin
):
    """
    - serial_connection_rf가 열려 있어야 함
    - txtEdit_rf_onTime: onTime(ms) 입력 위젯
    - txtEdit_rf_resmsg: 로그 표시할 QTextEdit
    - pin: self.pin 객체 (pin.on(), pin.off() 메서드가 있어야 함)
    """
    if not (serial_connection_rf and serial_connection_rf.is_open):
        txtEdit_rf_resmsg.append("Serial connection is not open")
        return

    try:
        dtr_ontime_str = txtEdit_rf_onTime.toPlainText().strip()
        dtr_ontime_ms = int(dtr_ontime_str)      # ms 값
        dtr_ontime_s  = dtr_ontime_ms * 1e-3     # ms -> s

        start_time = perf_counter()

        pin.on()  # GPIO HIGH
        txtEdit_rf_resmsg.append("PIN set to HIGH")

        # Busy-wait loop
        while perf_counter() - start_time < dtr_ontime_s:
            pass

        pin.off()  # GPIO LOW
        txtEdit_rf_resmsg.append("PIN set to LOW")

    except Exception as e:
        txtEdit_rf_resmsg.append(f"Error setting DTR high: {e}")

