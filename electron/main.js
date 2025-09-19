const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');
const fs = require('fs');

// WebSocket 연결 관리 변수
let ws = null;
let isConnected = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 2000;
const serverUrl = 'ws://127.0.0.1:8765';

// 파이썬 서버 프로세스 관리
let pythonProcess = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,  // 전체화면으로 시작
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // preload 스크립트 사용을 위해 false로 변경
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // 첫 화면: app/pages/main.html
  win.loadFile(path.join(__dirname, '..', 'app', 'pages', 'main.html'));
  
  return win;
}

// WebSocket 연결 함수
function connectWebSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('[Main] WebSocket 이미 연결되어 있음');
    return;
  }

  try {
    console.log(`[Main] WebSocket 서버 연결 시도: ${serverUrl}`);
    ws = new WebSocket(serverUrl);
    
    ws.on('open', () => {
      console.log('[Main] WebSocket 연결 성공');
      isConnected = true;
      reconnectAttempts = 0;
      
      // 모든 렌더러 프로세스에 연결 성공 알림
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('websocket-connected');
      });
      
      // 모터 자동 연결
      connectMotor();
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('[Main] WebSocket 메시지 수신:', message);
        
        // 모든 렌더러 프로세스에 메시지 전달
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('websocket-message', message);
        });
      } catch (error) {
        console.error('[Main] WebSocket 메시지 파싱 오류:', error);
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`[Main] WebSocket 연결 종료: ${code} ${reason}`);
      isConnected = false;
      
      // 모든 렌더러 프로세스에 연결 해제 알림
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('websocket-disconnected');
      });
      
      // 자동 재연결
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`[Main] ${reconnectDelay}ms 후 재연결 시도 (${reconnectAttempts}/${maxReconnectAttempts})`);
        setTimeout(connectWebSocket, reconnectDelay);
      }
    });

    ws.on('error', (error) => {
      console.error('[Main] WebSocket 오류:', error);
    });

  } catch (error) {
    console.error('[Main] WebSocket 연결 생성 오류:', error);
  }
}

// 모터 자동 연결
function connectMotor() {
  const motorConnectCommand = {
    cmd: 'connect',
    port: 'auto',
    baudrate: 19200,
    parity: 'none',
    databits: 8,
    stopbits: 1
  };
  
  sendWebSocketCommand(motorConnectCommand);
  console.log('[Main] 모터 자동 연결 명령 전송');
}

// WebSocket 명령 전송
function sendWebSocketCommand(command) {
  if (!isConnected || !ws) {
    console.warn('[Main] WebSocket 연결되지 않음. 명령 전송 실패:', command);
    return false;
  }

  try {
    ws.send(JSON.stringify(command));
    console.log('[Main] WebSocket 명령 전송:', command);
    return true;
  } catch (error) {
    console.error('[Main] WebSocket 명령 전송 오류:', error);
    return false;
  }
}

// IPC 핸들러 등록
ipcMain.handle('websocket-connect', () => {
  connectWebSocket();
  return isConnected;
});

ipcMain.handle('websocket-disconnect', () => {
  if (ws) {
    ws.close();
    ws = null;
    isConnected = false;
  }
  return true;
});

ipcMain.handle('websocket-send', (event, command) => {
  return sendWebSocketCommand(command);
});

ipcMain.handle('websocket-status', () => {
  return {
    connected: isConnected,
    reconnectAttempts: reconnectAttempts
  };
});

// 파이썬 서버를 시작하는 함수
function startPythonServer() {
  console.log('🚀 파이썬 웹소켓 서버를 시작합니다...');
  
  let command, args, workingDir;
  
  if (isDev) {
    // 개발 모드: Python 스크립트 직접 실행
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = path.join(__dirname, '..', 'backend', 'ws_server.py');
    workingDir = path.join(__dirname, '..', 'backend');
    
    command = pythonCmd;
    args = [scriptPath];
    
    console.log(`개발 모드 - Python 명령어: ${pythonCmd}`);
    console.log(`스크립트 경로: ${scriptPath}`);
  } else {
    // 패키징된 모드: 실행파일 우선, 없으면 Python 스크립트
    workingDir = path.join(process.resourcesPath, 'backend');
    const executablePaths = [
      path.join(workingDir, 'dist', 'ws_server'),     // Linux/macOS
      path.join(workingDir, 'dist', 'ws_server.exe')  // Windows
    ];
    const scriptPath = path.join(workingDir, 'ws_server.py');
    
    // 실행파일 존재 여부 확인 (여러 확장자 시도)
    let executablePath = null;
    for (const exePath of executablePaths) {
      if (fs.existsSync(exePath)) {
        executablePath = exePath;
        break;
      }
    }
    
    if (executablePath) {
      // PyInstaller로 빌드된 실행파일 사용
      command = executablePath;
      args = [];
      console.log(`패키징된 모드 - 실행파일 사용: ${executablePath}`);
    } else if (fs.existsSync(scriptPath)) {
      // Python 스크립트 사용 (fallback)
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      command = pythonCmd;
      args = [scriptPath];
      console.log(`패키징된 모드 - Python 스크립트 사용: ${scriptPath}`);
    } else {
      console.error('❌ 실행파일과 Python 스크립트 모두 찾을 수 없습니다.');
      return;
    }
  }
  
  console.log(`작업 디렉토리: ${workingDir}`);
  console.log(`개발 모드: ${isDev}`);
  console.log(`실행 명령어: ${command} ${args.join(' ')}`);
  
  pythonProcess = spawn(command, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: workingDir
  });

  // 파이썬 스크립트의 표준 출력 감시 (데이터 스트림 처리 강화)
  let stdoutBuffer = '';
  pythonProcess.stdout.on('data', (data) => {
    stdoutBuffer += data.toString();
    let newlineIndex;
    while ((newlineIndex = stdoutBuffer.indexOf('\n')) !== -1) {
      const line = stdoutBuffer.substring(0, newlineIndex).trim();
      stdoutBuffer = stdoutBuffer.substring(newlineIndex + 1);

      if (line) {
        console.log(`[Python Server] ${line}`);

        // SERVER_READY 신호를 감지하면 일렉트론 창 생성
        if (line === 'SERVER_READY') {
          console.log('✅✅✅ SERVER_READY 신호 감지! 프론트엔드 창을 생성합니다. ✅✅✅');
          createWindow();
          
          // 서버 준비 후 WebSocket 연결
          setTimeout(() => {
            connectWebSocket();
          }, 1000);
        }
      }
    }
  });

  // 파이썬 스크립트의 에러 출력 감시
  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python Server Error] ${data.toString()}`);
  });

  // 파이썬 프로세스 종료 감시
  pythonProcess.on('close', (code) => {
    console.log(`[Python Server] 프로세스가 종료되었습니다. 코드: ${code}`);
    pythonProcess = null;
  });

  pythonProcess.on('error', (error) => {
    console.error(`[Python Server] 프로세스 시작 오류: ${error.message}`);
  });
}

app.whenReady().then(() => {
  // 커스텀 프로토콜 등록 (file:// 프로토콜 보안 문제 해결)
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.substr(6); // 'app://' 제거
    const filePath = path.normalize(path.join(__dirname, '..', 'app', url));
    callback({ path: filePath });
  });

  // 파이썬 서버를 먼저 시작
  startPythonServer();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      // 서버가 이미 실행 중이면 바로 창 생성, 아니면 서버 재시작
      if (pythonProcess) {
        createWindow();
      } else {
        startPythonServer();
      }
    }
  });
});

// 앱 종료 시 파이썬 프로세스 정리
app.on('will-quit', () => {
  if (pythonProcess) {
    console.log('🔪 파이썬 서버 프로세스를 종료합니다.');
    pythonProcess.kill();
    pythonProcess = null;
  }
});

app.on('window-all-closed', () => {
  // WebSocket 연결 정리
  if (ws) {
    ws.close();
    ws = null;
  }
  
  if (process.platform !== 'darwin') app.quit();
});
