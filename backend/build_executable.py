#!/usr/bin/env python3
"""
PyInstaller를 사용하여 ws_server.py를 실행파일로 빌드하는 스크립트
"""
import os
import sys
import subprocess
import shutil
from pathlib import Path

def build_executable():
    """PyInstaller를 사용하여 실행파일 빌드"""
    
    # 현재 스크립트 위치 기준으로 경로 설정
    backend_dir = Path(__file__).parent.absolute()
    project_root = backend_dir.parent
    
    print(f"Backend 디렉토리: {backend_dir}")
    print(f"프로젝트 루트: {project_root}")
    
    # PyInstaller 명령어 구성
    pyinstaller_args = [
        sys.executable, '-m', 'PyInstaller',
        '--onefile',  # 단일 실행파일로 생성
        '--clean',    # 빌드 캐시 정리
        '--noconfirm', # 확인 없이 덮어쓰기
        '--name', 'ws_server',  # 실행파일 이름
        '--distpath', str(backend_dir / 'dist'),  # 출력 디렉토리
        '--workpath', str(backend_dir / 'build'), # 작업 디렉토리
        '--specpath', str(backend_dir),           # spec 파일 위치
        # 숨겨진 import 추가
        '--hidden-import', 'websockets',
        '--hidden-import', 'serial',
        '--hidden-import', 'gpiozero',
        '--hidden-import', 'smbus2',
        '--hidden-import', 'asyncio',
        '--hidden-import', 'json',
        '--hidden-import', 'time',
        '--hidden-import', 'queue',
        '--hidden-import', 'threading',
        # 콘솔 출력 유지 (SERVER_READY 신호를 위해 필요)
        '--console',
        # 메인 스크립트
        str(backend_dir / 'ws_server.py')
    ]
    
    print("PyInstaller 빌드 시작...")
    print(f"명령어: {' '.join(pyinstaller_args)}")
    
    try:
        # PyInstaller 실행
        result = subprocess.run(pyinstaller_args, 
                              cwd=backend_dir, 
                              check=True, 
                              capture_output=True, 
                              text=True)
        
        print("✅ PyInstaller 빌드 성공!")
        print(f"실행파일 위치: {backend_dir / 'dist' / 'ws_server'}")
        
        # 빌드 결과 확인
        executable_path = backend_dir / 'dist' / 'ws_server'
        if executable_path.exists():
            print(f"실행파일 크기: {executable_path.stat().st_size / (1024*1024):.1f} MB")
            # 실행 권한 부여 (Linux/macOS)
            if os.name != 'nt':
                os.chmod(executable_path, 0o755)
                print("실행 권한 부여 완료")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ PyInstaller 빌드 실패:")
        print(f"에러 코드: {e.returncode}")
        print(f"표준 출력: {e.stdout}")
        print(f"표준 에러: {e.stderr}")
        return False
    except Exception as e:
        print(f"❌ 빌드 중 예외 발생: {e}")
        return False

def clean_build_files():
    """빌드 임시 파일 정리"""
    backend_dir = Path(__file__).parent.absolute()
    
    # 정리할 디렉토리/파일 목록
    cleanup_items = [
        backend_dir / 'build',
        backend_dir / '__pycache__',
        backend_dir / 'ws_server.spec'
    ]
    
    for item in cleanup_items:
        if item.exists():
            if item.is_dir():
                shutil.rmtree(item)
                print(f"디렉토리 삭제: {item}")
            else:
                item.unlink()
                print(f"파일 삭제: {item}")

def main():
    """메인 함수"""
    print("=" * 50)
    print("SENSOVIA WebSocket Server 실행파일 빌드")
    print("=" * 50)
    
    # PyInstaller 설치 확인
    try:
        import PyInstaller
        print(f"PyInstaller 버전: {PyInstaller.__version__}")
    except ImportError:
        print("❌ PyInstaller가 설치되지 않았습니다.")
        print("설치 명령어: pip install pyinstaller")
        return False
    
    # 빌드 실행
    success = build_executable()
    
    if success:
        print("\n" + "=" * 50)
        print("✅ 빌드 완료!")
        print("실행파일을 electron-builder의 extraResources에 포함시키세요.")
        print("=" * 50)
        
        # 빌드 임시 파일 정리 여부 확인
        response = input("\n빌드 임시 파일을 정리하시겠습니까? (y/N): ")
        if response.lower() in ['y', 'yes']:
            clean_build_files()
            print("임시 파일 정리 완료")
    else:
        print("\n" + "=" * 50)
        print("❌ 빌드 실패")
        print("=" * 50)
    
    return success

if __name__ == "__main__":
    main()
