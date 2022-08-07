export interface Mod {
  id: string;
  name: string;
  bundleName: string;
  isBundle: boolean;
  isBundleCollapsed: boolean;
  children: Mod[];
  filePath: string | null;
  description: string;
  author: string;
  version: string;
  previewPath: string;
  enabled: boolean;
}

export const compareByName = (a: Mod, b: Mod): number => {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
};
