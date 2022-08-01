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
      // set image
      if (mod.filePath != null) {
        const imageElement: HTMLImageElement = template.content.querySelector(
          ".modentry-image .value"
        );
        imageElement.src =
          "file:///" +
          path.join(
            __dirname,
            "..",
            "tmp",
            path.basename(mod.filePath),
            mod.previewPath
          );
        imageElement.setAttribute("alt", mod.name);
      }
      // create element
      modListElement.appendChild(document.importNode(template.content, true));
      const createdElement: HTMLElement = document.querySelector(
        "#modlist .modentry:last-child"
      );
      if (mod.filePath != null) {
        const imageWrapperElement: HTMLElement =
          createdElement.querySelector(".modentry-image");
        const imageWrapperContent: string = imageWrapperElement.innerHTML;
        imageWrapperElement.innerHTML = imageWrapperContent;
      }
      // handle behaviour for bundle/mod
      if (mod.isBundle) {
        // list child mods
        const childList: HTMLElement = createdElement.querySelector(
          ".modentry-children .value"
        );
        mod.children.forEach((child: Mod) => {
          // set name
          setModEntryProperty(childtemplate, "child-name", child.name);
          // set initial icon
          const childIcon: string = child.enabled ? "check-square" : "square";
          childtemplate.content
            .querySelector(".modentry-child .modentry-child-icon .icon")
            .setAttribute("data-feather", childIcon);
          // create child
          childList.appendChild(
            document.importNode(childtemplate.content, true)
          );
          const createdChildElement: HTMLElement = childList.querySelector(
            ".modentry-child:last-child"
          );
          // add click listener
          createdChildElement
            .querySelector(".modentry-child-icon")
            .addEventListener("click", (event: Event) => {
              modService.toggleModEnabled(child).then((enabled: boolean) => {
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
            });
        });
        // add click listener to open/close child mods
        createdElement
          .querySelector(".modentry-mainicon")
          .addEventListener("click", (event: Event) => {
            const target: HTMLElement = event.currentTarget as HTMLElement;
            const wrapper: HTMLElement =
              target.parentElement.querySelector(".modentry-children");
            const open: boolean = wrapper.classList.contains("hidden");
            target.innerHTML = "";
            const iconElement: HTMLElement = document.createElement("em");
            iconElement.classList.add("icon");
            iconElement.setAttribute(
              "data-feather",
              open ? "minus-square" : "plus-square"
            );
            target.appendChild(iconElement);
            feather.replace();
            if (open) {
              wrapper.classList.remove("hidden");
            } else {
              wrapper.classList.add("hidden");
            }
          });
      } else {
        // add click listener to enable/disable mod
        createdElement
          .querySelector(".modentry-mainicon")
          .addEventListener("click", (event: Event) => {
            modService.toggleModEnabled(mod).then((enabled: boolean) => {
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
          });
      }
    });
    feather.replace();
  });
});
