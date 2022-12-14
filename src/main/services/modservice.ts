import { Mod, compareByName } from "../api/mod";
import { ModConfig } from "../api/modconfig";
import { ModInfoIni } from "../api/modinfoini";
import * as unrar from "node-unrar-js";
import type {
  Extractor,
  ArcList,
  FileHeader,
  ArcFile,
  ArcFiles,
} from "node-unrar-js";
import { Resolve, Reject } from "../api/promise";
import * as fs from "fs";
import * as fsp from "fs/promises"; // TODO: replace all fs sync calls with promise based
import * as fse from "fs-extra";
import * as path from "path";
import * as yaml from "js-yaml";
import configService from "./configservice";
import { Config } from "../api/config";

export const readModArchiveList = async (folder: string): Promise<string[]> => {
  return new Promise<string[]>((resolve: Resolve<string[]>, reject: Reject) => {
    (async (): Promise<void> => {
      try {
        const folders: string[] = await fsp.readdir(folder);
        resolve(
          folders
            .map((file: string) => path.join(folder, file))
            .filter(
              (file: string) =>
                file.endsWith(".rar") && !fs.lstatSync(file).isDirectory()
            )
        );
      } catch (err) {
        reject(err);
      }
    })();
  });
};

export const readModList = async (folder: string): Promise<Mod[]> => {
  return new Promise<Mod[]>((resolve: Resolve<Mod[]>, reject: Reject) => {
    (async (): Promise<void> => {
      try {
        const archives: string[] = await readModArchiveList(folder);
        const mods: Mod[] = [];

        const modConfig: ModConfig = await loadModConfig();
        for (const archiveFile of archives) {
          const mod: Mod = await readModArchive(archiveFile);
          if (isModEnabled(modConfig, mod)) {
            mod.enabled = true;
          }
          mods.push(mod);
          // unpack screenshot only
          //await unpackMod(mod, true);

          // FIXME: unpack completely on startup
          await unpackMod(mod, false);
        }

        resolve(mergeModBundles(mods));
      } catch (err) {
        reject(err);
      }
    })();
  });
};

export const readModArchive = async (archiveFile: string): Promise<Mod> => {
  return new Promise<Mod>((resolve: Resolve<Mod>, reject: Reject) => {
    (async (): Promise<void> => {
      try {
        // read archive
        const fileBuffer: Buffer = await fsp.readFile(archiveFile);
        const buf: ArrayBufferLike = Uint8Array.from(fileBuffer).buffer;
        const extractor: Extractor<Uint8Array> =
          await unrar.createExtractorFromData({
            data: buf,
          });
        const list: ArcList = extractor.getFileList();
        const fileHeaders: FileHeader[] = [...list.fileHeaders];
        // locate modinfo.ini
        const modinfoFileHeaders: FileHeader[] = fileHeaders.filter(
          (fileHeader: FileHeader) =>
            path.basename(fileHeader.name) == "modinfo.ini"
        );
        // proceed only if a single modinfo.ini file exists
        if (modinfoFileHeaders.length == 1) {
          // extract file
          const extracted: ArcFiles<Uint8Array> = extractor.extract({
            files: modinfoFileHeaders.map(
              (fileHeader: FileHeader) => fileHeader.name
            ),
          });
          const files: ArcFile<Uint8Array>[] = [...extracted.files];
          // load content
          const content: string = new TextDecoder().decode(files[0].extraction);
          const modinfo: ModInfoIni = readModinfoIni(content);
          // read relevant fields
          const mod: Mod = {
            id: archiveFile,
            name: modinfo.name,
            bundleName: modinfo.NameAsBundle,
            isBundle: false,
            isBundleCollapsed: false,
            children: [],
            filePath: archiveFile,
            description: modinfo.description,
            author: modinfo.author,
            version: modinfo.version,
            previewPath: modinfo.screenshot,
            enabled: false, // must be overwritten from ModConfig
          };
          resolve(mod);
        } else {
          reject(new Error("No modinfo.ini found"));
        }
      } catch (err) {
        reject(err);
      }
    })();
  });
};

export const readModinfoIni = (ini: string): ModInfoIni => {
  // remove CR
  const contentLines: string[] = ini.replace(/\r/g, "").split("\n");
  // convert ini to yaml
  const yamlContentLines: string[] = [];
  contentLines.forEach((contentLine: string) => {
    const index: number = contentLine.indexOf("=");
    if (index != -1) {
      yamlContentLines.push(
        contentLine.substring(0, index) +
          ': "' +
          contentLine.substring(index + 1) +
          '"'
      );
    }
  });
  const yamlContent: string = yamlContentLines.join("\n");
  // read yaml into object
  return yaml.load(yamlContent) as ModInfoIni;
};

export const mergeModBundles = (mods: Mod[]): Mod[] => {
  // sort by name, the first mod of the bundle provides basic infos
  mods.sort(compareByName);
  // find existing bundles
  const bundles: Record<string, number> = {};
  mods.forEach((mod: Mod) => {
    if (mod.bundleName) {
      if (bundles[mod.bundleName]) {
        bundles[mod.bundleName]++;
      } else {
        bundles[mod.bundleName] = 1;
      }
    }
  });
  // build bundles
  const bundledMods: Mod[] = [];
  mods.forEach((mod: Mod) => {
    if (mod.bundleName && bundles[mod.bundleName] > 1) {
      // found bundle with more then one mod
      const matchingBundles: Mod[] = bundledMods.filter(
        (bundledMod: Mod) => bundledMod.name == mod.bundleName
      );
      // check if bundle already exists
      if (matchingBundles.length == 0) {
        // create bundle and add mod
        const bundle: Mod = {
          id: mod.bundleName,
          name: mod.bundleName,
          bundleName: mod.bundleName,
          isBundle: true,
          isBundleCollapsed: true,
          children: [mod],
          filePath: null,
          description: mod.description,
          author: mod.author,
          version: mod.version,
          previewPath: mod.previewPath,
          enabled: false,
        };
        bundledMods.push(bundle);
      } else {
        // bundle already exists
        matchingBundles[0].children.push(mod);
      }
    } else {
      // mod without bundle
      bundledMods.push(mod);
    }
  });
  // fill bundle info from more then one child mod
  bundledMods.forEach((mod: Mod) => {
    if (mod.isBundle && mod.children.length > 0) {
      // version
      const versions: string[] = [
        ...new Set(mod.children.map((child: Mod) => child.version)),
      ];
      mod.version = versions.join(", ");
      // author
      const authors: string[] = [
        ...new Set(mod.children.map((child: Mod) => child.author)),
      ];
      mod.author = authors.join(", ");
    }
  });
  return bundledMods;
};

export const loadModConfig = async (): Promise<ModConfig> => {
  return new Promise<ModConfig>(
    (resolve: Resolve<ModConfig>, _reject: Reject) => {
      (async (): Promise<void> => {
        try {
          const modsContents: string = await fsp.readFile("mods.yml", {
            encoding: "utf-8",
          });
          const modConfig: ModConfig = yaml.load(modsContents) as ModConfig;
          if (modConfig === undefined || !modConfig.enabledMods) {
            resolve({ enabledMods: [] });
          } else {
            resolve(modConfig);
          }
        } catch (_ex: unknown) {
          resolve({ enabledMods: [] });
        }
      })();
    }
  );
};

export const isModEnabled = (modConfig: ModConfig, mod: Mod): boolean => {
  if (mod.filePath) {
    const basename: string = path.basename(mod.filePath);
    return (
      modConfig.enabledMods.filter(
        (enabledMod: string) => enabledMod == basename
      ).length != 0
    );
  }
  return false;
};

export const saveModConfig = (config: ModConfig): Promise<void> => {
  return new Promise<void>((resolve: Resolve<void>, _reject: Reject) => {
    (async (): Promise<void> => {
      await fsp.writeFile("mods.yml", yaml.dump(config));
      resolve();
    })();
  });
};

export const toggleModEnabled = async (mod: Mod): Promise<boolean> => {
  return new Promise<boolean>((resolve: Resolve<boolean>, reject: Reject) => {
    (async (): Promise<void> => {
      if (mod.filePath) {
        const basename: string = path.basename(mod.filePath);
        const modConfig: ModConfig = await loadModConfig();
        const enabled: boolean = isModEnabled(modConfig, mod);
        if (enabled) {
          // remove mod
          modConfig.enabledMods = modConfig.enabledMods.filter(
            (enabledMod: string) => enabledMod != basename
          );
          fs.writeFileSync("mods.yml", yaml.dump(modConfig));
          // make sure all other mods are enabled
          await rebuildNativesFolder();
        } else {
          // add mod
          modConfig.enabledMods.push(path.basename(mod.filePath));
          await fsp.writeFile("mods.yml", yaml.dump(modConfig));
          // unpack everything
          const targetFolder: string = await unpackMod(mod, false);
          const config: Config = await configService.loadConfig();
          // enable mod on top of previous
          await fse.copy(
            path.join(targetFolder, "natives"),
            config.app.nativesFolder,
            { overwrite: true }
          );
        }
        mod.enabled = !enabled;
        resolve(mod.enabled);
      } else {
        reject(new Error(`Mod ${mod.name} has no filePath!`));
      }
    })();
  });
};

export const rebuildNativesFolder = async (): Promise<boolean> => {
  return new Promise<boolean>((resolve: Resolve<boolean>, _reject: Reject) => {
    (async (): Promise<void> => {
      const config: Config = await configService.loadConfig();
      const modConfig: ModConfig = await loadModConfig();

      await fse.emptyDir(config.app.nativesFolder);

      for (const filePath of modConfig.enabledMods) {
        /*
        const mod: Mod = await readModArchive(
          path.join(config.app.modsFolder, filePath)
        );
        */
        //const targetFolder: string = await unpackMod(mod, false);
        const basename: string = path.basename(filePath);
        const targetFolder: string = path.join("./tmp", basename);

        await fse.copy(
          path.join(targetFolder, "natives"),
          config.app.nativesFolder,
          {
            overwrite: true,
          }
        );
      }

      resolve(true);
    })();
  });
};

export const unpackMod = async (
  mod: Mod,
  screenshotOnly: boolean
): Promise<string> => {
  return new Promise<string>((resolve: Resolve<string>, reject: Reject) => {
    (async (): Promise<void> => {
      if (mod.filePath) {
        const basename: string = path.basename(mod.filePath);
        const targetFolder: string = path.join("./tmp", basename);

        if (!fs.existsSync(targetFolder)) {
          const buf: ArrayBufferLike = Uint8Array.from(
            await fsp.readFile(mod.filePath)
          ).buffer;
          const extractor: Extractor<Uint8Array> =
            await unrar.createExtractorFromData({
              data: buf,
            });
          const list: ArcList = extractor.getFileList();
          const fileHeaders: FileHeader[] = [...list.fileHeaders];
          const modinfoFileHeaders: FileHeader[] = fileHeaders.filter(
            (fileHeader: FileHeader) =>
              path.basename(fileHeader.name) == "modinfo.ini"
          );
          if (modinfoFileHeaders.length == 1) {
            const subdirs: number =
              modinfoFileHeaders[0].name.split("/").length - 1;
            const fileHeadersExtract: FileHeader[] = screenshotOnly
              ? fileHeaders.filter((fileHeader: FileHeader) => {
                  return path.basename(fileHeader.name) == mod.previewPath;
                })
              : fileHeaders;
            const extracted: ArcFiles<Uint8Array> = extractor.extract({
              files: fileHeadersExtract.map(
                (fileHeader: FileHeader) => fileHeader.name
              ),
            });

            const files: ArcFile<Uint8Array>[] = [...extracted.files];
            //files.forEach((file: ArcFile<Uint8Array>) => {

            for (const file of files) {
              if (file.fileHeader && file.extraction) {
                let relPath: string = file.fileHeader.name;
                if (subdirs == 0 || relPath.indexOf("/") != -1) {
                  // only continue if its a valid file (excludes topfolders)
                  for (let i: number = 0; i < subdirs; i++) {
                    relPath = relPath.substring(relPath.indexOf("/") + 1);
                  }

                  const targetPath: string = path.join(targetFolder, relPath);

                  if (file.fileHeader.flags.directory) {
                    await fsp.mkdir(targetPath, { recursive: true });
                  } else {
                    await fsp.mkdir(path.dirname(targetPath), {
                      recursive: true,
                    });
                    await fsp.writeFile(targetPath, file.extraction);
                  }
                }
              }
            }
            resolve(targetFolder);
          }
        } else {
          resolve(targetFolder);
        }
      } else {
        reject("No file path given!");
      }
    })();
  });
};

interface ModService {
  readModList: (folder: string) => Promise<Mod[]>;
  saveModConfig: (config: ModConfig) => Promise<void>;
  toggleModEnabled: (mod: Mod) => Promise<boolean>;
  readModArchive: (archiveFile: string) => Promise<Mod>;
  loadModConfig: () => Promise<ModConfig>;
}

export const modService: ModService = {
  readModList,
  saveModConfig,
  toggleModEnabled,
  readModArchive,
  loadModConfig,
};

export default modService;
