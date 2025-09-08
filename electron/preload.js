const { contextBridge, ipcRenderer } = require('electron');

// WebSocket 연결을 메인 프로세스에서 관리하도록 브릿지 생성
contextBridge.exposeInMainWorld('electronAPI', {
    // WebSocket 관련 API
    connectWebSocket: () => ipcRenderer.invoke('websocket-connect'),
    disconnectWebSocket: () => ipcRenderer.invoke('websocket-disconnect'),
    sendWebSocketCommand: (command) => ipcRenderer.invoke('websocket-send', command),
    getConnectionStatus: () => ipcRenderer.invoke('websocket-status'),
    
    // WebSocket 이벤트 리스너
    onWebSocketMessage: (callback) => ipcRenderer.on('websocket-message', callback),
    onWebSocketConnected: (callback) => ipcRenderer.on('websocket-connected', callback),
    onWebSocketDisconnected: (callback) => ipcRenderer.on('websocket-disconnected', callback),
    
    // 이벤트 리스너 제거
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

console.log('[Preload] Electron API 브릿지 생성 완료');
