import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { Mod } from "./api/mod";
import { ElectronApi, FileCallback, ModListCallback } from "./api/types";

contextBridge.exposeInMainWorld("api", {
  log: (msg: string) => {
    ipcRenderer.send("log", msg);
  },
  readDir: (dir: string, func: FileCallback) => {
    ipcRenderer.on(
      "response-readDir",
      (_event: IpcRendererEvent, arg: { dir: string; files: string[] }) =>
        func(arg.dir, arg.files)
    );
    ipcRenderer.send("request-readDir", dir);
  },
  readModList: (func: ModListCallback) => {
    ipcRenderer.on(
      "response-readModList",
      (_event: IpcRendererEvent, mods: Mod[]) => func(mods)
    );
    ipcRenderer.send("request-readModList");
  },
} as ElectronApi);
