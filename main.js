const { app, BrowserWindow } = require('electron');

const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    // icon: 'icon.ico',
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true, // Dejar asi
      contextIsolation: false, // Dejar asi
      enableRemoteModule: true, // Dejar asi
    },
  });


  mainWindow.menuBarVisible = false;
  mainWindow.loadFile('index.html')
}
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
