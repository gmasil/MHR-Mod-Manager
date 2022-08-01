import { Mod } from "../types/mod";
import { ModConfig } from "../types/modconfig";
import { ModInfoIni } from "../types/modinfoini";
import * as unrar from "node-unrar-js";
import {
  Extractor,
  ArcList,
  FileHeader,
  ArcFile,
  ArcFiles,
} from "node-unrar-js";
import { Resolve, Reject } from "../types/promise";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

export const readModArchiveList = (folder: string): string[] => {
  return fs
    .readdirSync(folder)
    .map((file: string) => path.join(folder, file))
    .filter(
      (file: string) =>
        file.endsWith(".rar") && !fs.lstatSync(file).isDirectory()
    );
};

export const readModList = async (folder: string): Promise<Mod[]> => {
  return new Promise<Mod[]>((resolve: Resolve<Mod[]>, reject: Reject) => {
    (async (): Promise<void> => {
      try {
        const archives: string[] = readModArchiveList(folder);
        const mods: Mod[] = [];

        const modConfig: ModConfig = loadModConfig();
        for (const archiveFile of archives) {
          const mod: Mod = await readModArchive(archiveFile);
          if (isModEnabled(modConfig, mod)) {
            mod.enabled = true;
          }
          mods.push(mod);
          // unpack screenshot only
          await unpackMod(mod, true);
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
        const buf: ArrayBufferLike = Uint8Array.from(
          fs.readFileSync(archiveFile)
        ).buffer;
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
          // read content
          const content: string = new TextDecoder().decode(files[0].extraction);
          const contentLines: string[] = content.replace(/\r/g, "").split("\n");
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

          // read yaml as json
          const modinfo: ModInfoIni = yaml.load(
            yamlContentLines.join("\n")
          ) as ModInfoIni;

          // read relevant fields
          const mod: Mod = {
            name: modinfo.name,
            bundleName: modinfo.NameAsBundle,
            isBundle: false,
            children: [],
            filePath: archiveFile,
            description: modinfo.description,
            author: modinfo.author,
            version: modinfo.version,
            previewPath: modinfo.screenshot,
            enabled: false, // must be overwritten from ModConfig
          };

          resolve(mod);
        }
        reject(new Error("No modinfo.ini found"));
      } catch (err) {
        reject(err);
      }
    })();
  });
};

export const mergeModBundles = (mods: Mod[]): Mod[] => {
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
      // check if bundle already exists
      if (
        bundledMods.filter(
          (bundledMod: Mod) => bundledMod.bundleName == mod.bundleName
        ).length == 0
      ) {
        const bundle: Mod = {
          name: mod.bundleName,
          bundleName: mod.bundleName,
          isBundle: true,
          children: [],
          filePath: null,
          description: null,
          author: null,
          version: null,
          previewPath: null,
          enabled: false,
        };
        bundledMods.push(bundle);
      }
    }
  });
  // add mods to bundles or directly if no bundle present
  mods.forEach((mod: Mod) => {
    if (mod.bundleName) {
      if (bundles[mod.bundleName] > 1) {
        // mod is part of a valid bundle, add it
        bundledMods.forEach((bundledMod: Mod) => {
          if (bundledMod.isBundle && bundledMod.bundleName === mod.bundleName) {
            bundledMod.children.push(mod);
          }
        });
      } else {
        // mod is part of bundle, but only one mod present, add directly
        bundledMods.push(mod);
      }
    } else {
      // mod without bundle, add directly
      bundledMods.push(mod);
    }
  });
  // sort mod bundle children
  bundledMods.forEach((mod: Mod) => {
    if (mod.isBundle && mod.children.length > 1) {
      mod.children.sort();
    }
  });
  // fill bundle info from first child mod
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
      // description
      mod.description = mod.children[0].description;
    }
  });
  return bundledMods;
};

export const loadModConfig = (): ModConfig => {
  if (fs.existsSync("mods.yml")) {
    return yaml.load(
      fs.readFileSync("mods.yml", { encoding: "utf-8" })
    ) as ModConfig;
  }
  return { enabledMods: [] } as ModConfig;
};

export const isModEnabled = (config: ModConfig, mod: Mod): boolean => {
  return (
    config.enabledMods.filter(
      (enabledMod: string) => enabledMod == path.basename(mod.filePath)
    ).length != 0
  );
};

export const markModEnabled = (mod: Mod): void => {
  const config: ModConfig = loadModConfig();
  config.enabledMods.push(path.basename(mod.filePath));
  fs.writeFile("mods.yml", yaml.dump(config), (err: NodeJS.ErrnoException) => {
    if (err) {
      console.log(err);
    }
  });
};

export const toggleModEnabled = async (mod: Mod): Promise<boolean> => {
  return new Promise<boolean>((resolve: Resolve<boolean>, reject: Reject) => {
    (async (): Promise<void> => {
      const config: ModConfig = loadModConfig();
      const enabled: boolean = isModEnabled(config, mod);
      if (enabled) {
        // remove mod
        config.enabledMods = config.enabledMods.filter(
          (enabledMod: string) => enabledMod != path.basename(mod.filePath)
        );
      } else {
        // add mod
        config.enabledMods.push(path.basename(mod.filePath));
        // unpack everything
        await unpackMod(mod, false);
      }
      fs.writeFile(
        "mods.yml",
        yaml.dump(config),
        (err: NodeJS.ErrnoException) => {
          if (err) {
            console.log(err);
          }
        }
      );
      resolve(!enabled);
    })();
  });
};

export const unpackMod = async (
  mod: Mod,
  screenshotOnly: boolean
): Promise<void> => {
  const buf: ArrayBufferLike = Uint8Array.from(
    fs.readFileSync(mod.filePath)
  ).buffer;
  const extractor: Extractor<Uint8Array> = await unrar.createExtractorFromData({
    data: buf,
  });
  const list: ArcList = extractor.getFileList();
  const fileHeaders: FileHeader[] = [...list.fileHeaders];
  const modinfoFileHeaders: FileHeader[] = fileHeaders.filter(
    (fileHeader: FileHeader) => path.basename(fileHeader.name) == "modinfo.ini"
  );
  if (modinfoFileHeaders.length == 1) {
    const subdirs: number = modinfoFileHeaders[0].name.split("/").length - 1;
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
    files.forEach((file: ArcFile<Uint8Array>) => {
      let relPath: string = file.fileHeader.name;
      if (subdirs == 0 || relPath.indexOf("/") != -1) {
        // only continue if its a valid file (excludes topfolders)
        for (let i: number = 0; i < subdirs; i++) {
          relPath = relPath.substring(relPath.indexOf("/") + 1);
        }

        const targetPath: string = path.join(
          "./tmp",
          path.basename(mod.filePath),
          relPath
        );

        if (file.fileHeader.flags.directory) {
          fs.mkdirSync(targetPath, { recursive: true });
        } else {
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });
          fs.writeFile(
            targetPath,
            file.extraction,
            (err: NodeJS.ErrnoException) => {
              if (err) {
                console.log(err);
              }
            }
          );
        }
      }
    });
  }
};

interface ModService {
  readModList: (folder: string) => Promise<Mod[]>;
  markModEnabled: (mod: Mod) => void;
  toggleModEnabled: (mod: Mod) => Promise<boolean>;
}

export const modService: ModService = {
  readModList,
  markModEnabled,
  toggleModEnabled,
};

export default modService;
