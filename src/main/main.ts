import { app, BrowserWindow, ipcMain, IpcMainEvent } from "electron";
import * as path from "path";
import * as fs from "fs/promises";
import { modService } from "./services/modservice";
import { configService } from "./services/configservice";
import { Mod } from "./api/mod";
import { Config } from "./api/config";

let mainWindow: BrowserWindow;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.NODE_ENV === "development") {
    const rendererPort: string = process.argv[2];
    mainWindow.loadURL(`http://localhost:${rendererPort}`);
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), "renderer", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.on("log", (_event: IpcMainEvent, msg: string) => {
  // eslint-disable-next-line no-console
  console.log(msg);
});

ipcMain.on("request-readDir", (_event: IpcMainEvent, dir: string) => {
  fs.readdir(dir).then((files: string[]) => {
    mainWindow.webContents.send("response-readDir", { dir, files });
  });
});

ipcMain.on("request-readModList", (_event: IpcMainEvent) => {
  configService.loadConfig().then((config: Config) => {
    modService.readModList(config.app.modsFolder).then((mods: Mod[]) => {
      mainWindow.webContents.send("response-readModList", mods);
    });
  });
});
