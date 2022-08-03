const Path = require("path");
const Colors = require("colors/safe");
const FileSystem = require("fs");
const compileTs = require("./private/tsc");

function buildRenderer() {
  const Vite = require("vite");
  const viteConfig = require(Path.join(__dirname, "..", "config", "vite.js"));

  return Vite.build({
    ...viteConfig,
    base: "./",
    mode: "production",
  });
}

function buildMain() {
  const mainPath = Path.join(__dirname, "..", "src", "main");
  return compileTs(mainPath);
}

FileSystem.rmSync(Path.join(__dirname, "..", "build"), {
  recursive: true,
  force: true,
});

console.log(Colors.brightBlue("Transpiling renderer & main..."));

Promise.allSettled([buildRenderer(), buildMain()]).then(() => {
  console.log(
    Colors.brightGreen(
      "Renderer & main successfully transpiled! (ready to be built with electron-builder)"
    )
  );
});
