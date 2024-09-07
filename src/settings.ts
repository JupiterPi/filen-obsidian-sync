import FilenSyncPlugin from "./main"

export interface FilenSyncSettings {
	filenEmail: string | null
	filenPassword: string | null
	remoteRoot: string
	lastSyncedTimes: Record<string, number>
}

export const defaultSettings: FilenSyncSettings = {
	filenEmail: null,
	filenPassword: null,
	remoteRoot: "Obsidian Vault",
	lastSyncedTimes: {},
}

export class Settings {
	private readonly plugin: FilenSyncPlugin

	settings: FilenSyncSettings

	constructor(plugin: FilenSyncPlugin) {
		this.plugin = plugin
	}

	async init() {
		this.settings = Object.assign({}, defaultSettings, await this.plugin.loadData())
	}

	async saveSettings() {
		await this.plugin.saveData(this.settings)
	}
}
