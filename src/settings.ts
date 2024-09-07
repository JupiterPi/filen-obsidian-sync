import { PluginSettingTab, Setting } from "obsidian"
import FilenSyncPlugin from "./main"
import { toast } from "./util"

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

	display() {
		const element = this.containerEl
		element.empty()

		this.displayHeader(element, "Login")
		this.displayLoginLogout(element)

		this.displayHeader(element, "Options")
		this.displayRemoteRoot(element)
	}

	private displayHeader(element: HTMLElement, header: string) {
		new Setting(element)
			.setHeading()
			.setName(header)
	}

	private displayLoginLogout(element: HTMLElement) {
		let email = ""
		let password = ""

		if (!this.plugin.filenEmail) {
			new Setting(element)
				.setName("Enter your credentials")
				.addText(text => text
					.setPlaceholder("mail@example.com")
					.setValue("")
					.onChange(async (value) => {
						email = value
					})
				)
				.addText(text => text
					.setPlaceholder("********")
					.setValue("")
					.onChange(async (value) => {
						password = value
					})
				)
				.addButton(button => button
					.setButtonText("Login")
					.onClick(async () => {
						try {
							await this.plugin.filen.login({ email, password })
							this.plugin.settings.settings.filenEmail = email
							this.plugin.settings.settings.filenPassword = password
							await this.plugin.settings.saveSettings()
							toast(`Logged in as ${email}`)
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
						this.plugin.settings.settings.filenEmail = null
						this.plugin.settings.settings.filenPassword = null
						await this.plugin.settings.saveSettings()
						toast("Logged out")
						this.display()
					})
				)
		}
	}

	private displayRemoteRoot(element: HTMLElement) {
		let remoteRoot = this.plugin.settings.settings.remoteRoot

		const updateEdited: ((edited: boolean) => void)[] = []

		new Setting(element)
			.setName("Remote Root")
			.addText(text => text
				.setValue(remoteRoot)
				.setPlaceholder(defaultSettings.remoteRoot)
				.onChange(async (input) => {
					remoteRoot = input
					updateEdited.forEach(update => update(
						remoteRoot !== this.plugin.settings.settings.remoteRoot
					))
				})
			)
			.addButton(button => {
				button
					.setButtonText("Save")
					.onClick(async () => {
						if (remoteRoot === "") remoteRoot = defaultSettings.remoteRoot

						// validate path
						try {
							const stat = await this.plugin.filen.fs().stat({ path: remoteRoot })
							if (!stat.isDirectory()) {
								toast("Invalid remote root: Is not a directory")
								this.display()
								return
							}
						} catch (e) {
							toast("Invalid remote rot: Does not exist")
							this.display()
							return
						}

						this.plugin.settings.settings.remoteRoot = remoteRoot
						await this.plugin.settings.saveSettings()
						toast(`Saved remote root: ${remoteRoot}`)
						this.display()
					})
					.setDisabled(true)
				updateEdited.push(edited => button.setDisabled(!edited))
			})
			.addButton(button => {
				button
					.setButtonText("Cancel")
					.onClick(async () => {
						this.display()
					})
					.setDisabled(true)
				updateEdited.push(edited => button.setDisabled(!edited))
			})
	}
}