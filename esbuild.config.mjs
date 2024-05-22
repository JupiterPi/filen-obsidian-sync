import esbuild from "esbuild"
import builtins from "builtin-modules"
import * as fs from "node:fs";

const banner =
`/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/
`

const prod = (process.argv[2] === "production")

const outDir = prod ? "build" : "dev-vault/.obsidian/plugins/filen-obsidian-sync"

fs.cpSync("src/manifest.json", `${outDir}/manifest.json`)

const context = await esbuild.context({
    banner: {
        js: banner,
    },
    entryPoints: ["src/main.ts"],
    bundle: true,
    external: [
        "obsidian",
        "electron",
        "@codemirror/autocomplete",
        "@codemirror/collab",
        "@codemirror/commands",
        "@codemirror/language",
        "@codemirror/lint",
        "@codemirror/search",
        "@codemirror/state",
        "@codemirror/view",
        "@lezer/common",
        "@lezer/highlight",
        "@lezer/lr",
        ...builtins],
    format: "cjs",
    target: "es2018",
    logLevel: "info",
    sourcemap: prod ? false : "inline",
    treeShaking: true,
    outfile: prod ? "build/main.js" : "dev-vault/.obsidian/plugins/filen-obsidian-sync/main.js",
})

if (prod) {
    await context.rebuild()
    process.exit(0)
} else {
    await context.watch()
}