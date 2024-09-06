import FilenSyncPlugin from "./main"
import { toast } from "./util"

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
			modTimeLocal: number | null,
			modTimeRemote: number | null,
		}[] = []

		// aggregate local files
		const localFiles = this.plugin.app.vault.getFiles()
		for (const localFile of localFiles) {
			files.push({ path: localFile.path, modTimeLocal: localFile.stat.mtime, modTimeRemote: null })
		}

		// aggregate remote files
		const remoteRoot = this.plugin.settings.settings.remoteRoot
		const remoteUUID = await this.plugin.filen.fs().pathToItemUUID({ path: remoteRoot })
		if (remoteUUID === null) {
			toast(`Invalid remote root ${remoteRoot}: does not exist`)
			return
		}
		const remoteItems = await this.plugin.filen.cloud().getDirectoryTree({ uuid: remoteUUID })
		for (const [path, cloudItem] of Object.entries(remoteItems)) {
			const filePath = path.startsWith("/") ? path.substring(1) : path
			if (cloudItem.type !== "file") continue
			const file = files.find(f => f.path === filePath)
			if (file !== undefined) {
				file.modTimeRemote = cloudItem.lastModified
			} else {
				files.push({ path: filePath, modTimeLocal: null, modTimeRemote: cloudItem.lastModified })
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
			if ((file.modTimeLocal ?? 0) > (file.modTimeRemote ?? 0)) {

				// upload file
				promises.push((async () => {
					const content = await this.plugin.app.vault.readBinary(localFile)
					const uploadFile = new File([content], fileName, { lastModified: file.modTimeLocal })
					const parentUUID = await this.plugin.filen.fs().mkdir({ path: this.plugin.resolveRemotePath(parentPath) })
					await this.plugin.filen.cloud().uploadWebFile({ file: uploadFile, parent: parentUUID })
				})())
				uploads++

			} else if ((file.modTimeLocal ?? 0) < (file.modTimeRemote ?? 0)) {

				// download file
				promises.push((async () => {
					const stat = await this.plugin.filen.fs().stat({ path: this.plugin.resolveRemotePath(file.path) })
					const content = await this.plugin.filen.fs().readFile({ path: this.plugin.resolveRemotePath(file.path) })
					if (localFile !== null) {
						await this.plugin.app.vault.modifyBinary(localFile, content)
					} else {
						if (this.plugin.app.vault.getFolderByPath(parentPath) === null) {
							await this.plugin.app.vault.createFolder(parentPath)
						}
						await this.plugin.app.vault.createBinary(file.path, content, { mtime: stat.mtimeMs })
					}
				})())
				downloads++

			}
		}
		if (uploads + downloads > 0) {
			toast(`Filen Sync: ${uploads} up, ${downloads} down`)
			await Promise.all(promises)
			toast("Filen Sync: Done.")
		} else {
			toast("Filen Sync: Up to date.")
		}

	}
}