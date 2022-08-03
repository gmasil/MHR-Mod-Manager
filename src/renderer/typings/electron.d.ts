import { ElectronApi } from "../../main/api/types";

declare global {
  interface Window {
    api: ElectronApi;
  }
}
