const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // preload: path.join(__dirname, 'preload.js'), // 브릿지 필요할 때만 사용
    },
  });

  // 첫 화면: app/pages/main.html
  win.loadFile(path.join(__dirname, '..', 'app', 'pages', 'main.html'));
  
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
