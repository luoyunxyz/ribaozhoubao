const { app, BrowserWindow } = require('electron');
const path = require('node:path');

process.env.OPEN_BROWSER = '0';
process.env.PORT = process.env.PORT || '8088';

let serverModule;
let window;

async function createWindow() {
  serverModule = await import(path.join(__dirname, '..', 'src', 'main.mjs'));
  window = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 960,
    minHeight: 640,
    title: '本地工作记录助手',
    webPreferences: {
      contextIsolation: true
    }
  });
  await window.loadURL(`http://127.0.0.1:${process.env.PORT}/app`);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
