import { Plugin } from "obsidian"
import FilenSDK from "@filen/sdk"
import { Settings } from "./settings"
import { toast } from "./util"
import { Sync } from "./sync"
import * as pathModule from "path"

export default class FilenSyncPlugin extends Plugin {
	filen = new FilenSDK()

	settings = new Settings(this)
	sync = new Sync(this)

	async onload() {
		console.log("Loaded")

		await this.settings.init()
		await this.sync.init()

		// if settings contain email, try to log in
		if (this.settings.settings.filenEmail !== null) {
			try {
				await this.filen.login({
					email: this.settings.settings.filenEmail,
					password: this.settings.settings.filenPassword
				})
				console.log(`Logged in as ${this.settings.settings.filenEmail} (saved)`)
			} catch (e) {
				toast("Invalid Filen credentials! Please login again in settings.")
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

	public get filenEmail() {
		return this.settings.settings.filenEmail
	}

	public resolveRemotePath(path: string) {
		return pathModule.join(this.settings.settings.remoteRoot, path).split(pathModule.sep).join("/")
	}
}