import FilenSyncPlugin from "./main"
import { toast } from "./util"
import { TFile } from "obsidian"
import { CloudItemFile } from "@filen/sdk"
import { CloudItemBase } from "@filen/sdk/dist/types/cloud"

type CloudItemTreeFile = Omit<{ type: "file" } & CloudItemBase & CloudItemFile, "favorited" | "rm" | "timestamp">

export class Sync {
	private readonly plugin: FilenSyncPlugin

	constructor(plugin: FilenSyncPlugin) {
		this.plugin = plugin
	}

	async init() {
		this.plugin.addCommand({
			id: "sync",
			name: "Filen Sync",
			callback: async () => {
				await this.sync()
			},
			icon: "folder-sync"
		})
		this.plugin.addRibbonIcon("folder-sync", "Filen Sync", async () => await this.sync())
	}

	private async sync() {

		const files: {
			path: string,
			localFile: TFile | null,
			remoteFile: CloudItemTreeFile | null,
		}[] = []

		// aggregate local files
		const localFiles = this.plugin.app.vault.getFiles()
		for (const localFile of localFiles) {
			files.push({ path: localFile.path, localFile, remoteFile: null })
		}

		// aggregate remote files
		const remoteRoot = this.plugin.settings.settings.remoteRoot
		const remoteUUID = await this.plugin.filen.fs().pathToItemUUID({ path: remoteRoot })
		if (remoteUUID === null) {
			toast(`Invalid remote root ${remoteRoot}: does not exist`)
			return
		}
		await this.plugin.filen.fs().readdir({ path: remoteRoot, recursive: true }) //TODO temporary fix to refresh cache
		const remoteItems = await this.plugin.filen.cloud().getDirectoryTree({ uuid: remoteUUID, skipCache: true })
		for (const [path, cloudItem] of Object.entries(remoteItems)) {
			const filePath = path.startsWith("/") ? path.substring(1) : path
			if (cloudItem.type !== "file") continue
			const file = files.find(f => f.path === filePath)
			if (file !== undefined) {
				file.remoteFile = cloudItem
			} else {
				files.push({ path: filePath, localFile: null, remoteFile: cloudItem })
			}
		}

		// handle files
		const promises: Promise<void>[] = []
		let uploads = 0
		let downloads = 0
		for (const file of files) {
			const localFile = this.plugin.app.vault.getFileByPath(file.path)
			const [parentPath, fileName] = (() => {
				const lastSlashIndex = file.path.lastIndexOf("/")
				return [file.path.substring(0, Math.max(lastSlashIndex, 0)), file.path.substring(lastSlashIndex+1)]
			})()
			const action = (() => {
				const localModificationTime = file.localFile?.stat?.mtime ?? 0
				const remoteModificationTime = file.remoteFile?.lastModified ?? 0
				const lastSyncedTime = this.plugin.settings.settings.lastSyncedTimes[file.path]

				if (localModificationTime === 0) return "download"
				if (remoteModificationTime === 0) return "upload"

				if (lastSyncedTime === undefined) return "conflict:no-last-synced-time"

				if (localModificationTime === lastSyncedTime && remoteModificationTime === lastSyncedTime) return "nothing"
				else if (localModificationTime > remoteModificationTime && remoteModificationTime === lastSyncedTime) return "upload"
				else if (localModificationTime < remoteModificationTime && localModificationTime === lastSyncedTime) return "download"
				else return "conflict:conflicting-times"
			})()
			if (action === "upload") {

				// upload file
				promises.push((async () => {
					const content = await this.plugin.app.vault.readBinary(localFile)
					const uploadFile = new File([content], fileName, { lastModified: file.localFile.stat.mtime })
					const parentUUID = await this.plugin.filen.fs().mkdir({ path: this.plugin.resolveRemotePath(parentPath) })
					await this.plugin.filen.cloud().uploadWebFile({ file: uploadFile, parent: parentUUID })
					this.plugin.settings.settings.lastSyncedTimes[file.path] = file.localFile.stat.mtime
				})())
				console.log(`Uploading ${file.path}`)
				uploads++

			}
			if (action === "download") {

				// download file
				promises.push((async () => {
					const stat = await this.plugin.filen.fs().stat({ path: this.plugin.resolveRemotePath(file.path) })
					const content = await this.plugin.filen.fs().readFile({ path: this.plugin.resolveRemotePath(file.path) })
					if (localFile !== null) {
						await this.plugin.app.vault.modifyBinary(localFile, content, { mtime: stat.mtimeMs })
					} else {
						if (this.plugin.app.vault.getFolderByPath(parentPath) === null) {
							await this.plugin.app.vault.createFolder(parentPath)
						}
						await this.plugin.app.vault.createBinary(file.path, content, { mtime: stat.mtimeMs })
					}
					this.plugin.settings.settings.lastSyncedTimes[file.path] = stat.mtimeMs
				})())
				console.log(`Downloading ${file.path}`)
				downloads++

			}
			if (action === "conflict:no-last-synced-time" || action === "conflict:conflicting-times") {

				// conflict
				toast(`Sync conflict on file: ${file.path}`)
				console.log(`Sync conflict on ${file.path}: ${action}`)

			}
		}
		if (uploads + downloads > 0) {
			toast(`Filen Sync: ${uploads} up, ${downloads} down`)

			await Promise.all(promises)
			await this.plugin.settings.saveSettings()

			toast("Filen Sync: Done.")
		} else {
			toast("Filen Sync: Up to date.")
		}

	}
}