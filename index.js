const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const url = require("url");

var window = null;

app.on('ready', async () => {
    window = new BrowserWindow({
        height: 720,
        width: 1280,
        resizable: true,
        transparent: true
    });

    window.loadURL(url.format({
        pathname: path.join(__dirname, 'app', 'index.html'),
        protocol: 'file:',
        slashes: true
    }));
});

ipcMain.on('close-main-window', (event) => {
    app.quit();
});
