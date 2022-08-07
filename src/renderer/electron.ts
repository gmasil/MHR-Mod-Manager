import { Mod } from "../main/api/mod";
import type {
  LogFunction,
  ModEnabledCallback,
  ReadModListFunction,
} from "../main/api/types";

const log: LogFunction = window.api.log;
const readModList: ReadModListFunction = window.api.readModList;
const onModEnabledChange: (func: ModEnabledCallback) => void =
  window.api.onModEnabledChange;
const toggleModEnabled: (filePath: string) => void =
  window.api.toggleModEnabled;

export { log, readModList, onModEnabledChange, toggleModEnabled };
