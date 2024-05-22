import { Plugin } from "obsidian"

export default class MyPlugin extends Plugin {
	onload() {
		console.log("Loaded")
	}

	onunload() {
		console.log("Unloaded")
	}
}