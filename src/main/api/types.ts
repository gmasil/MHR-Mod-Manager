import { Mod } from "./mod";

export type LogFunction = (msg: string) => void;

export type FileCallback = (dir: string, files: string[]) => void;

export type ReadDirFunction = (dir: string, func: FileCallback) => void;

export type ModListCallback = (mods: Mod[]) => void;

export type ReadModListFunction = (func: ModListCallback) => void;

export interface ElectronApi {
  log: LogFunction;
  readDir: ReadDirFunction;
  readModList: ReadModListFunction;
}
