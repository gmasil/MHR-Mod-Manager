import { Config } from "../api/config";
import * as fs from "fs";
import * as yaml from "js-yaml";
import { Resolve, Reject } from "../api/promise";

export const loadConfig = async (): Promise<Config> => {
  return new Promise<Config>((resolve: Resolve<Config>, reject: Reject) => {
    try {
      if (fs.existsSync("config.yml")) {
        const config: Config = yaml.load(
          fs.readFileSync("config.yml", { encoding: "utf-8" })
        ) as Config;
        resolve(config);
      } else {
        const config: Config = {
          app: { modsFolder: "mods", nativesFolder: "natives" },
        };
        resolve(config);
      }
    } catch (err) {
      reject(err);
    }
  });
};

interface ConfigService {
  loadConfig: () => Promise<Config>;
}

export const configService: ConfigService = {
  loadConfig,
};

export default configService;
