const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const WebSocket = require('ws');
const fs = require('fs');

// WebSocket 연결 관리 변수
let ws = null;
let isConnected = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 2000;
const serverUrl = 'ws://127.0.0.1:8765';

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    fullscreen: true,  // 전체화면 모드로 시작
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

app.whenReady().then(() => {
  // 커스텀 프로토콜 등록 (file:// 프로토콜 보안 문제 해결)
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.substr(6); // 'app://' 제거
    const filePath = path.normalize(path.join(__dirname, '..', 'app', url));
    callback({ path: filePath });
  });

  const win = createWindow();
  
  // 앱 시작 시 WebSocket 자동 연결
  setTimeout(() => {
    connectWebSocket();
  }, 1000);
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // WebSocket 연결 정리
  if (ws) {
    ws.close();
    ws = null;
  }
  
  if (process.platform !== 'darwin') app.quit();
});
