import FilenSyncPlugin from "./main"
import { ConfirmDeleteDialog } from "./ui/confirmDeleteDialog"
import { toast } from "./ui/ui"
import { TFile } from "obsidian"
import { CloudItemBase } from "@filen/sdk/dist/types/cloud"
import { CloudItemFile } from "@filen/sdk"

type File = {
	path: string,
	localFile: TFile | null,
	remoteFile: CloudItemTreeFile | null,
}

type CloudItemTreeFile = Omit<{ type: "file" } & CloudItemBase & CloudItemFile, "favorited" | "rm" | "timestamp">

export class Sync {
	private readonly plugin: FilenSyncPlugin

	constructor(plugin: FilenSyncPlugin) {
		this.plugin = plugin
	}

	public async sync() {

		const files: File[] = []

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
			// choose action
			const action = (() => {
				const localModificationTime = file.localFile?.stat?.mtime ?? 0
				const remoteModificationTime = file.remoteFile?.lastModified ?? 0
				const lastSyncedTime = this.plugin.settings.settings.lastSyncedTimes[file.path]

				if (localModificationTime === 0) return lastSyncedTime === undefined ? "download" : "delete-remote"
				if (remoteModificationTime === 0) return lastSyncedTime === undefined ? "upload" : "delete-local"

				if (localModificationTime === lastSyncedTime && remoteModificationTime === lastSyncedTime) return "nothing"
				else if (localModificationTime > remoteModificationTime && remoteModificationTime === lastSyncedTime) return "upload"
				else if (localModificationTime < remoteModificationTime && localModificationTime === lastSyncedTime) return "download"
				else return "conflict"
			})()

			// perform action
			if (action === "upload") {
				console.log(`Uploading ${file.path}`)
				uploads++
				promises.push(this.uploadFile(file))
			}
			if (action === "download") {
				console.log(`Downloading ${file.path}`)
				downloads++
				promises.push(this.downloadFile(file))
			}
			if (action === "delete-local" || action === "delete-remote") {
				new ConfirmDeleteDialog(this.plugin.app, file.path, action === "delete-local" ? "local" : "remote", () => {
					console.log(`Deleting ${file.path} ${action === "delete-local" ? "locally" : "on remote"}`)
					promises.push(action === "delete-local" ? this.deleteLocalFile(file) : this.deleteRemoteFile(file))
				}).open()
			}
			if (action === "conflict") {
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

	private splitPath(path: string): { parentPath: string, fileName: string } {
		const lastSlashIndex = path.lastIndexOf("/")
		return {
			parentPath: path.substring(0, Math.max(lastSlashIndex, 0)),
			fileName: path.substring(lastSlashIndex+1)
		}
	}

	private async uploadFile(file: File): Promise<void>{
		const { parentPath, fileName } = this.splitPath(file.path)
		const content = await this.plugin.app.vault.readBinary(file.localFile)
		const uploadFile = new File([content], fileName, { lastModified: file.localFile.stat.mtime })
		const parentUUID = await this.plugin.filen.fs().mkdir({ path: this.plugin.resolveRemotePath(parentPath) })
		await this.plugin.filen.cloud().uploadWebFile({ file: uploadFile, parent: parentUUID })
		this.plugin.settings.settings.lastSyncedTimes[file.path] = file.localFile.stat.mtime
	}

	private async downloadFile(file: File): Promise<void> {
		const { parentPath } = this.splitPath(file.path)
		const stat = await this.plugin.filen.fs().stat({ path: this.plugin.resolveRemotePath(file.path) })
		const content = await this.plugin.filen.fs().readFile({ path: this.plugin.resolveRemotePath(file.path) })
		if (file.localFile !== null) {
			await this.plugin.app.vault.modifyBinary(file.localFile, content, { mtime: stat.mtimeMs })
		} else {
			if (this.plugin.app.vault.getFolderByPath(parentPath) === null) {
				await this.plugin.app.vault.createFolder(parentPath)
			}
			await this.plugin.app.vault.createBinary(file.path, content, { mtime: stat.mtimeMs })
		}
		this.plugin.settings.settings.lastSyncedTimes[file.path] = stat.mtimeMs
	}

	private async deleteLocalFile(file: File): Promise<void> {
		await this.plugin.app.vault.delete(file.localFile)
		delete this.plugin.settings.settings.lastSyncedTimes[file.path]
	}

	private async deleteRemoteFile(file: File): Promise<void> {
		await this.plugin.filen.fs().rm({ path: this.plugin.resolveRemotePath(file.path) })
		delete this.plugin.settings.settings.lastSyncedTimes[file.path]
	}
}