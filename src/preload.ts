import { configService } from "./services/configservice";
import { modService } from "./services/modservice";
import { Mod } from "./types/mod";
import { Config } from "./types/config";

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener("DOMContentLoaded", () => {
	const replaceText = (selector: string, text: string): void => {
		const element: HTMLElement = document.getElementById(selector);
		if (element) {
			element.innerText = text;
		}
	};

	for (const type of ["chrome", "node", "electron"]) {
		replaceText(
			`${type}-version`,
			process.versions[type as keyof NodeJS.ProcessVersions]
		);
	}

	const config: Config = configService.loadConfig();

	const modListElement: HTMLElement = document.getElementById("modlist");
	modService.readModList(config.app.modsFolder);

	const setModEntryProperty = (
		template: HTMLTemplateElement,
		property: string,
		value: string | number
	): void => {
		template.content.querySelector(
			".modentry-" + property + " .value"
		).textContent = "" + value;
	};

	modService.readModList(config.app.modsFolder).then((mods: Mod[]) => {
		const template: HTMLTemplateElement = document.getElementById(
			"template-modentry"
		) as HTMLTemplateElement;
		const childtemplate: HTMLTemplateElement = document.getElementById(
			"template-modentry-child"
		) as HTMLTemplateElement;
		mods.forEach((mod: Mod) => {
			// set values
			setModEntryProperty(template, "name", mod.name);
			setModEntryProperty(template, "description", mod.description);
			setModEntryProperty(template, "author", mod.author);
			setModEntryProperty(template, "version", mod.version);
			// create element
			modListElement.appendChild(document.importNode(template.content, true));
			if (mod.isBundle) {
				const childList: HTMLElement = document.querySelector(
					"#modlist .modentry:last-child .modentry-childred"
				);
				mod.children.forEach((child: Mod) => {
					setModEntryProperty(childtemplate, "child-name", child.name);
					childList.appendChild(
						document.importNode(childtemplate.content, true)
					);
				});
			}
		});
	});
});
