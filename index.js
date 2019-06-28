const app = require("electron").app;
const BrowserWindow = require("electron").BrowserWindow;
const path = require("path");
const open = require("open");
const url = require("url");

let mainWindow = null;

function handleRedirect(event, url) {
  if (url !== mainWindow.webContents.getURL()) {
    event.preventDefault();
    open(url);
  }
}

function createMainWindow() {
  let win = new BrowserWindow({
    height: 720,
    width: 1280,
    resizable: true,
    webPreferences: {
      nodeIntegration: true
    }
  });

  win.loadURL(
    url.format({
      pathname: path.join(app.getAppPath(), "app", "index.html"),
      protocol: "file:",
      slashes: true
    })
  );

  ["new-window", "will-navigate"].forEach(eventType => {
    win.webContents.on(eventType, handleRedirect);
  });

  win.on("closed", () => {
    mainWindow = null;
  });

  return win;
}

app.on("window-all-closed", event => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (!mainWindow) {
    mainWindow = createMainWindow();
  }
});

app.on("ready", () => {
  mainWindow = createMainWindow();
});
