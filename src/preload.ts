import { configService } from "./services/configservice";
import { modService } from "./services/modservice";
import { Mod } from "./types/mod";
import { Config } from "./types/config";
import * as feather from "feather-icons";
import * as path from "path";

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener("DOMContentLoaded", () => {
	feather.replace();

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
			console.log(mod.filePath);
			// set icon
			let icon: string;
			if (mod.isBundle) {
				icon = "plus-square";
			} else if (mod.enabled) {
				icon = "check-square";
			} else {
				icon = "square";
			}
			template.content
				.querySelector(".modentry-mainicon .icon")
				.setAttribute("data-feather", icon);
			// create identifier for click listener
			if (!mod.isBundle) {
				template.content
					.querySelector(".modentry-mainicon")
					.setAttribute("mod-identifier", path.basename(mod.filePath));
			}
			// create element
			modListElement.appendChild(document.importNode(template.content, true));
			const createdElement: HTMLElement = document.querySelector(
				"#modlist .modentry:last-child"
			);
			// add click listener
			createdElement
				.querySelector(".modentry-mainicon")
				.addEventListener("click", (event: Event) => {
					console.log("click");
					const enabled: boolean = modService.toggleModEnabled(mod);
					const target: HTMLElement = event.currentTarget as HTMLElement;
					target.innerHTML = "";
					const iconElement: HTMLElement = document.createElement("em");
					iconElement.classList.add("icon");
					iconElement.setAttribute(
						"data-feather",
						enabled ? "check-square" : "square"
					);
					target.appendChild(iconElement);
					feather.replace();
				});
			if (mod.isBundle) {
				const childList: HTMLElement =
					createdElement.querySelector(".modentry-childred");
				mod.children.forEach((child: Mod) => {
					setModEntryProperty(childtemplate, "child-name", child.name);
					childList.appendChild(
						document.importNode(childtemplate.content, true)
					);
				});
			}
		});
		feather.replace();
	});
});
