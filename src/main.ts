import { Plugin } from "obsidian"
import FilenSDK from "@filen/sdk"
import { Settings } from "./settings"
import * as pathModule from "path"
import { initSettingsTab } from "./ui/settingsTab"
import { initCommands, toast } from "./ui/ui"

export default class FilenSyncPlugin extends Plugin {
	filen = new FilenSDK()

	settings = new Settings(this)

	async onload() {
		console.log("Loaded")

		await this.settings.init()

		// if settings contain email, try to log in
		if (this.settings.settings.filenEmail !== null) {
			try {
				await this.filen.login({
					email: this.settings.settings.filenEmail,
					password: this.settings.settings.filenPassword!
				})
				console.log(`Logged in as ${this.settings.settings.filenEmail} (saved)`)
			} catch (e) {
				toast("Invalid Filen credentials! Please login again in settings.")
				this.settings.settings.filenEmail = null
				this.settings.settings.filenPassword = null
				await this.settings.saveSettings()
			}
		}

		initSettingsTab(this)
		initCommands(this)
	}

	async onunload() {
		console.log("Unloaded")
	}

	public resolveRemotePath(path: string) {
		return pathModule.join(this.settings.settings.remoteRoot, path).split(pathModule.sep).join("/")
	}
}