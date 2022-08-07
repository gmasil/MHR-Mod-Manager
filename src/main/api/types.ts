import { Mod } from "./mod";

export type LogFunction = (msg: string) => void;

export type ModListCallback = (mods: Mod[]) => void;

export type ReadModListFunction = (func: ModListCallback) => void;

export type ModEnabledCallback = (mod: Mod, enabled: boolean) => void;

export type ToggleModEnabledFunction = (func: ModEnabledCallback) => void;

export interface ElectronApi {
  log: LogFunction;
  readModList: ReadModListFunction;
  onModEnabledChange: ToggleModEnabledFunction;
  toggleModEnabled: (filePath: string) => void;
}
