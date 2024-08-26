import { PluginSettingTab, Setting } from "obsidian"
import FilenSyncPlugin from "./main"
import { toast } from "./util"

export interface FilenSyncSettings {
	filenEmail: string | null
	filenPassword: string | null
}

export const defaultSettings: FilenSyncSettings = {
	filenEmail: null,
	filenPassword: null
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
	initSettingsTab() {
		this.plugin.addSettingTab(new FilenSyncSettingTab(this.plugin))
	}

	async saveSettings() {
		await this.plugin.saveData(this.settings)
	}
}

class FilenSyncSettingTab extends PluginSettingTab {
	private readonly plugin: FilenSyncPlugin

	constructor(plugin: FilenSyncPlugin) {
		super(plugin.app, plugin)
		this.plugin = plugin
	}

	private email: string
	private password: string

	display() {
		const element = this.containerEl
		element.empty()
		new Setting(element)
			.setHeading()
			.setName("Login")
		if (!this.plugin.filenEmail) {
			new Setting(element)
				.setName("Enter your credentials")
				.addText(text => text
					.setPlaceholder("mail@example.com")
					.setValue("")
					.onChange(async (value) => {
						this.email = value
					})
				)
				.addText(text => text
					.setPlaceholder("********")
					.setValue("")
					.onChange(async (value) => {
						this.password = value
					})
				)
				.addButton(button => button
					.setButtonText("Login")
					.onClick(async () => {
						try {
							await this.plugin.filen.login({ email: this.email, password: this.password })
							this.plugin.filenEmail = this.email
							this.plugin.settings.settings.filenEmail = this.email
							this.plugin.settings.settings.filenPassword = this.password
							await this.plugin.settings.saveSettings()
							toast(`Logged in as ${this.email}`)
						} catch (e) {
							toast("Invalid credentials!")
						}
						this.display()
					})
				)
		} else {
			new Setting(element)
				.setName(`Logged in as ${this.plugin.filenEmail}`)
				.addButton(button => button
					.setButtonText("Logout")
					.onClick(async () => {
						this.plugin.filen.logout()
						this.plugin.filenEmail = null
						this.plugin.settings.settings.filenEmail = null
						this.plugin.settings.settings.filenPassword = null
						await this.plugin.settings.saveSettings()
						toast("Logged out")
						this.display()
					})
				)
		}
	}
}