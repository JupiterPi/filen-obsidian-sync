import FilenSyncPlugin from "../main"
import { Notice } from "obsidian"
import { Sync } from "../sync"

export function initCommands(plugin: FilenSyncPlugin) {
	plugin.addCommand({
		id: "sync",
		name: "Filen Sync",
		callback: async () => {
			await new Sync(plugin).sync()
		},
		icon: "folder-sync"
	})
	plugin.addRibbonIcon("folder-sync", "Filen Sync", async () => await this.sync())
}

export function toast(msg: string) {
	new Notice(msg, 2000)
}