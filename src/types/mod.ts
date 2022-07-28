export interface Mod {
	name: string;
	bundleName: string;
	isBundle: boolean;
	children: Mod[];
	filePath: string;
	description: string;
	author: string;
	version: string;
	previewPath: string;
}
