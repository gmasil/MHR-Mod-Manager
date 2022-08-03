import type {
  LogFunction,
  ReadDirFunction,
  ReadModListFunction,
} from "../main/api/types";

const log: LogFunction = window.api.log;
const readDir: ReadDirFunction = window.api.readDir;
const readModList: ReadModListFunction = window.api.readModList;

export { log, readDir, readModList };
