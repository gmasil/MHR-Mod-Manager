import { Config } from "../types/config";
import * as fs from "fs";
import * as yaml from "js-yaml";

export const loadConfig = (): Config => {
  return yaml.load(
    fs.readFileSync("config.yml", { encoding: "utf-8" })
  ) as Config;
};

interface ConfigService {
  loadConfig: () => Config;
}

export const configService: ConfigService = {
  loadConfig,
};

export default configService;
