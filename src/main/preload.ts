import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { Mod } from "./api/mod";
import { ElectronApi, ModListCallback, ModEnabledCallback } from "./api/types";

const x: ElectronApi = {
  log: (msg: string) => {
    ipcRenderer.send("log", msg);
  },
  readModList: (func: ModListCallback) => {
    ipcRenderer.on(
      "response-readModList",
      (_event: IpcRendererEvent, mods: Mod[]) => func(mods)
    );
    ipcRenderer.send("request-readModList");
  },
  onModEnabledChange: (func: ModEnabledCallback) => {
    ipcRenderer.on(
      "response-toggleModEnabled",
      (_event: IpcRendererEvent, mod: Mod, enabled: boolean) =>
        func(mod, enabled)
    );
  },
  toggleModEnabled: (filePath: string) => {
    ipcRenderer.send("request-toggleModEnabled", filePath);
  },
};

contextBridge.exposeInMainWorld("api", x);
