import FilenSyncPlugin from "../main"
import { Notice } from "obsidian"
import { Sync } from "../sync"

export function initCommands(plugin: FilenSyncPlugin) {
	const sync = async () => await new Sync(plugin).sync()
	plugin.addCommand({
		id: "sync",
		name: "Filen Sync",
		callback: sync,
		icon: "folder-sync"
	})
	plugin.addRibbonIcon("folder-sync", "Filen Sync", sync)
}

export function toast(msg: string) {
	new Notice(msg, 2000)
}