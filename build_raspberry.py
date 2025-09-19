#!/usr/bin/env python3
"""
라즈베리파이용 SENSOVIA 일렉트론 앱 완전 자동화 빌드 스크립트
- 파이썬 웹소켓 서버를 PyInstaller로 실행파일 생성
- 일렉트론 앱을 라즈베리파이용으로 빌드
- 모든 의존성을 포함한 배포 패키지 생성
"""
import os
import sys
import subprocess
import shutil
import json
from pathlib import Path

class RaspberryPiBuildManager:
    def __init__(self):
        self.project_root = Path(__file__).parent.absolute()
        self.backend_dir = self.project_root / 'backend'
        self.dist_dir = self.project_root / 'dist'
        
        print(f"프로젝트 루트: {self.project_root}")
        print(f"백엔드 디렉토리: {self.backend_dir}")
    
    def check_dependencies(self):
        """필요한 의존성 확인"""
        print("\n🔍 의존성 확인 중...")
        
        # Node.js 확인
        try:
            result = subprocess.run(['node', '--version'], 
                                  capture_output=True, text=True, check=True)
            print(f"✅ Node.js: {result.stdout.strip()}")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ Node.js가 설치되지 않았습니다.")
            return False
        
        # npm 확인 (윈도우 호환성 개선)
        npm_commands = ['npm', 'npm.cmd']
        npm_found = False
        
        for npm_cmd in npm_commands:
            try:
                result = subprocess.run([npm_cmd, '--version'], 
                                      capture_output=True, text=True, check=True)
                print(f"✅ npm: {result.stdout.strip()}")
                npm_found = True
                break
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue
        
        if not npm_found:
            print("❌ npm이 설치되지 않았습니다.")
            return False
        
        # Python 확인
        try:
            result = subprocess.run([sys.executable, '--version'], 
                                  capture_output=True, text=True, check=True)
            print(f"✅ Python: {result.stdout.strip()}")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ Python이 설치되지 않았습니다.")
            return False
        
        # PyInstaller 확인
        try:
            import PyInstaller
            print(f"✅ PyInstaller: {PyInstaller.__version__}")
        except ImportError:
            print("⚠️  PyInstaller가 설치되지 않았습니다. 자동 설치를 시도합니다...")
            try:
                subprocess.run([sys.executable, '-m', 'pip', 'install', 'pyinstaller'], 
                             check=True)
                print("✅ PyInstaller 설치 완료")
            except subprocess.CalledProcessError:
                print("❌ PyInstaller 설치 실패")
                return False
        
        return True
    
    def install_python_dependencies(self):
        """Python 의존성 설치"""
        print("\n📦 Python 의존성 설치 중...")
        
        requirements_file = self.backend_dir / 'requirements.txt'
        if not requirements_file.exists():
            print("❌ requirements.txt 파일을 찾을 수 없습니다.")
            return False
        
        try:
            subprocess.run([
                sys.executable, '-m', 'pip', 'install', '-r', str(requirements_file)
            ], check=True, cwd=self.backend_dir)
            print("✅ Python 의존성 설치 완료")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Python 의존성 설치 실패: {e}")
            return False
    
    def install_node_dependencies(self):
        """Node.js 의존성 설치"""
        print("\n📦 Node.js 의존성 설치 중...")
        
        # 윈도우 호환성을 위한 npm 명령어 시도
        npm_commands = ['npm', 'npm.cmd']
        
        for npm_cmd in npm_commands:
            try:
                subprocess.run([npm_cmd, 'install'], check=True, cwd=self.project_root)
                print("✅ Node.js 의존성 설치 완료")
                return True
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue
        
        try:
            # 마지막 시도
            subprocess.run(['npm', 'install'], check=True, cwd=self.project_root)
            print("✅ Node.js 의존성 설치 완료")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Node.js 의존성 설치 실패: {e}")
            return False
    
    def build_python_executable(self):
        """PyInstaller로 파이썬 실행파일 빌드"""
        print("\n🔨 파이썬 웹소켓 서버 실행파일 빌드 중...")
        
        build_script = self.backend_dir / 'build_executable.py'
        if not build_script.exists():
            print("❌ build_executable.py 스크립트를 찾을 수 없습니다.")
            return False
        
        try:
            subprocess.run([sys.executable, str(build_script)], 
                         check=True, cwd=self.backend_dir, input='n\n', text=True)
            
            # 실행파일 확인 (윈도우/리눅스 호환)
            executable_names = ['ws_server.exe', 'ws_server']
            executable_found = False
            
            for exe_name in executable_names:
                executable_path = self.backend_dir / 'dist' / exe_name
                if executable_path.exists():
                    print(f"✅ 파이썬 실행파일 빌드 완료: {exe_name}")
                    executable_found = True
                    break
            
            if not executable_found:
                print("❌ 실행파일이 생성되지 않았습니다.")
                return False
            
            return True
                
        except subprocess.CalledProcessError as e:
            print(f"❌ 파이썬 실행파일 빌드 실패: {e}")
            return False
    
    def build_frontend(self):
        """Vite로 프론트엔드 빌드"""
        print("\n🔨 프론트엔드 빌드 중 (Vite)...")

        # 윈도우 호환성을 위한 npm 명령어 시도
        npm_commands = ['npm', 'npm.cmd']
        build_success = False

        for npm_cmd in npm_commands:
            try:
                # 'npm run build' 실행
                build_cmd = [npm_cmd, 'run', 'build']
                subprocess.run(build_cmd, check=True, cwd=self.project_root)
                build_success = True
                print(f"✅ 'npm run build' 성공 ({npm_cmd})")
                break
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue

        if not build_success:
            print(f"❌ 프론트엔드 빌드 실패")
            return False

        # Vite 빌드 결과물 확인 (프로젝트 루트의 dist 폴더)
        vite_dist_dir = self.project_root / 'dist'
        if not vite_dist_dir.exists() or not any(vite_dist_dir.iterdir()):
            print(f"❌ Vite 빌드 결과물 폴더({vite_dist_dir})가 비어있습니다.")
            return False

        print("✅ 프론트엔드 빌드 완료")
        return True

    def build_electron_app(self, arch='arm64'):
        """일렉트론 앱 빌드"""
        print(f"\n🔨 일렉트론 앱 빌드 중 (아키텍처: {arch})...")
        
        # 빌드 명령어 결정 (윈도우 호환성)
        npm_commands = ['npm', 'npm.cmd']
        
        if arch == 'arm64':
            build_script = 'build:raspberry'
        elif arch == 'armv7l':
            build_script = 'build:raspberry-32'
        else:
            print(f"❌ 지원하지 않는 아키텍처: {arch}")
            return False
        
        # npm 명령어 시도
        build_success = False
        for npm_cmd in npm_commands:
            try:
                build_cmd = [npm_cmd, 'run', build_script]
                subprocess.run(build_cmd, check=True, cwd=self.project_root)
                build_success = True
                break
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue
        
        if not build_success:
            print(f"❌ 일렉트론 빌드 실패")
            return False
        
        print("✅ 일렉트론 앱 빌드 완료")
        return True
    
    def create_deployment_package(self, arch='arm64'):
        """배포 패키지 생성"""
        print("\n📦 배포 패키지 생성 중...")
        
        # 빌드된 앱 경로
        if arch == 'arm64':
            app_dir = self.dist_dir / 'linux-arm64-unpacked'
        else:
            app_dir = self.dist_dir / 'linux-armv7l-unpacked'
        
        if not app_dir.exists():
            print(f"❌ 빌드된 앱을 찾을 수 없습니다: {app_dir}")
            return False
        
        # 배포 패키지 디렉토리 생성
        package_name = f"sensovia-raspberry-{arch}"
        package_dir = self.dist_dir / package_name
        
        if package_dir.exists():
            shutil.rmtree(package_dir)
        package_dir.mkdir(parents=True)
        
        # 앱 파일 복사
        shutil.copytree(app_dir, package_dir / 'app')
        
        # 실행 스크립트 생성
        launch_script = package_dir / 'start_sensovia.sh'
        launch_script.write_text(f'''#!/bin/bash
# SENSOVIA 라즈베리파이 실행 스크립트

echo "SENSOVIA 시작 중..."
cd "$(dirname "$0")/app"
./sensovia-electron --no-sandbox --disable-gpu
''')
        launch_script.chmod(0o755)
        
        # README 파일 생성
        readme_file = package_dir / 'README.md'
        readme_file.write_text(f'''# SENSOVIA for Raspberry Pi ({arch})

## 설치 및 실행

1. 이 폴더를 라즈베리파이에 복사하세요.
2. 터미널에서 다음 명령어를 실행하세요:

```bash
chmod +x start_sensovia.sh
./start_sensovia.sh
```

## 시스템 요구사항

- Raspberry Pi 4/5 (64-bit OS 권장)
- Python 3.7 이상 (실행파일 사용 시 불필요)
- 충분한 저장 공간 (최소 500MB)

## 문제 해결

앱이 시작되지 않는 경우:
1. 실행 권한 확인: `chmod +x app/sensovia-electron`
2. 의존성 확인: `ldd app/sensovia-electron`
3. 로그 확인: 터미널에서 직접 실행

## 지원

문의사항이 있으시면 개발팀에 연락하세요.
''')
        
        print(f"✅ 배포 패키지 생성 완료: {package_dir}")
        return True
    
    def cleanup_build_files(self):
        """빌드 임시 파일 정리"""
        print("\n🧹 빌드 임시 파일 정리 중...")
        
        cleanup_items = [
            self.backend_dir / 'build',
            self.backend_dir / '__pycache__',
            self.backend_dir / 'ws_server.spec'
        ]
        
        for item in cleanup_items:
            if item.exists():
                if item.is_dir():
                    shutil.rmtree(item)
                else:
                    item.unlink()
                print(f"삭제: {item}")
        
        print("✅ 정리 완료")
    
    def build_all(self, arch='arm64', cleanup=True):
        """전체 빌드 프로세스 실행"""
        print("=" * 60)
        print("🚀 SENSOVIA 라즈베리파이 빌드 시작")
        print("=" * 60)
        
        steps = [
            ("의존성 확인", self.check_dependencies),
            ("Python 의존성 설치", self.install_python_dependencies),
            ("Node.js 의존성 설치", self.install_node_dependencies),
            ("프론트엔드 빌드", self.build_frontend),
            ("파이썬 실행파일 빌드", self.build_python_executable),
            ("일렉트론 앱 빌드", lambda: self.build_electron_app(arch)),
            ("배포 패키지 생성", lambda: self.create_deployment_package(arch))
        ]
        
        for step_name, step_func in steps:
            print(f"\n{'='*20} {step_name} {'='*20}")
            if not step_func():
                print(f"❌ {step_name} 실패")
                return False
        
        if cleanup:
            self.cleanup_build_files()
        
        print("\n" + "=" * 60)
        print("🎉 빌드 완료!")
        print(f"배포 패키지: {self.dist_dir}/sensovia-raspberry-{arch}/")
        print("=" * 60)
        
        return True

def main():
    """메인 함수"""
    import argparse
    
    parser = argparse.ArgumentParser(description='SENSOVIA 라즈베리파이 빌드')
    parser.add_argument('--arch', choices=['arm64', 'armv7l'], default='arm64',
                       help='타겟 아키텍처 (기본값: arm64)')
    parser.add_argument('--no-cleanup', action='store_true',
                       help='빌드 임시 파일을 정리하지 않음')
    
    args = parser.parse_args()
    
    builder = RaspberryPiBuildManager()
    success = builder.build_all(arch=args.arch, cleanup=not args.no_cleanup)
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
