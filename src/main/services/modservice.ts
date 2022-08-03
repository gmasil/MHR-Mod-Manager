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
import * as path from "path";
import * as yaml from "js-yaml";

export const readModArchiveList = (folder: string): string[] => {
  if (fs.existsSync(folder)) {
    return fs
      .readdirSync(folder)
      .map((file: string) => path.join(folder, file))
      .filter(
        (file: string) =>
          file.endsWith(".rar") && !fs.lstatSync(file).isDirectory()
      );
  } else {
    return [];
  }
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
          // load content
          const content: string = new TextDecoder().decode(files[0].extraction);
          const modinfo: ModInfoIni = readModinfoIni(content);
          // read relevant fields
          const mod: Mod = {
            id: archiveFile,
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

export const loadModConfig = (): ModConfig => {
  if (fs.existsSync("mods.yml")) {
    return yaml.load(
      fs.readFileSync("mods.yml", { encoding: "utf-8" })
    ) as ModConfig;
  }
  return { enabledMods: [] } as ModConfig;
};

export const isModEnabled = (config: ModConfig, mod: Mod): boolean => {
  if (mod.filePath) {
    const basename: string = path.basename(mod.filePath);
    return (
      config.enabledMods.filter((enabledMod: string) => enabledMod == basename)
        .length != 0
    );
  }
  return false;
};

export const markModEnabled = (mod: Mod): void => {
  if (mod.filePath) {
    const config: ModConfig = loadModConfig();
    config.enabledMods.push(path.basename(mod.filePath));
    fs.writeFileSync("mods.yml", yaml.dump(config));
  }
};

export const toggleModEnabled = async (mod: Mod): Promise<boolean> => {
  return new Promise<boolean>((resolve: Resolve<boolean>, reject: Reject) => {
    (async (): Promise<void> => {
      if (mod.filePath) {
        const basename: string = path.basename(mod.filePath);
        const config: ModConfig = loadModConfig();
        const enabled: boolean = isModEnabled(config, mod);
        if (enabled) {
          // remove mod
          config.enabledMods = config.enabledMods.filter(
            (enabledMod: string) => enabledMod != basename
          );
        } else {
          // add mod
          config.enabledMods.push(path.basename(mod.filePath));
          // unpack everything
          await unpackMod(mod, false);
        }
        fs.writeFileSync("mods.yml", yaml.dump(config));
        resolve(!enabled);
      } else {
        reject(new Error(`Mod ${mod.name} has no filePath!`));
      }
    })();
  });
};

export const unpackMod = async (
  mod: Mod,
  screenshotOnly: boolean
): Promise<void> => {
  if (mod.filePath) {
    const basename: string = path.basename(mod.filePath);
    const buf: ArrayBufferLike = Uint8Array.from(
      fs.readFileSync(mod.filePath)
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
        if (file.fileHeader && file.extraction) {
          let relPath: string = file.fileHeader.name;
          if (subdirs == 0 || relPath.indexOf("/") != -1) {
            // only continue if its a valid file (excludes topfolders)
            for (let i: number = 0; i < subdirs; i++) {
              relPath = relPath.substring(relPath.indexOf("/") + 1);
            }

            const targetPath: string = path.join("./tmp", basename, relPath);

            if (file.fileHeader.flags.directory) {
              fs.mkdirSync(targetPath, { recursive: true });
            } else {
              fs.mkdirSync(path.dirname(targetPath), { recursive: true });
              fs.writeFileSync(targetPath, file.extraction);
            }
          }
        }
      });
    }
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
