import { Plugin } from "obsidian"
import FilenSDK from "@filen/sdk"
import { Settings } from "./settings"
import { notice } from "./util"

export default class FilenSyncPlugin extends Plugin {
	filen = new FilenSDK()
	filenEmail: string | null = null
	settings = new Settings(this)

	async onload() {
		console.log("Loaded")

		await this.settings.init()
		if (this.settings.settings.filenEmail != null) {
			try {
				await this.filen.login({
					email: this.settings.settings.filenEmail,
					password: this.settings.settings.filenPassword
				})
				console.log(`Filen Sync: Logged in as ${this.settings.settings.filenEmail}`)
				this.filenEmail = this.settings.settings.filenEmail
			} catch (e) {
				notice("Invalid Filen credentials! Please login again in settings.")
				this.settings.settings.filenEmail = null
				this.settings.settings.filenPassword = null
				await this.settings.saveSettings()
			}
		}
		this.settings.initSettingsTab()
	}

	async onunload() {
		console.log("Unloaded")
	}
}