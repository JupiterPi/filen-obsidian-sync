import { App, Modal } from "obsidian"

export class ConfirmDeleteDialog extends Modal {
	private readonly path: string
	private readonly location: "local" | "remote"
	private readonly callback: () => void

	constructor(app: App, path: string, location: "local" | "remote", callback: () => void) {
		super(app)
		this.path = path
		this.location = location
		this.callback = callback
	}

	onOpen() {
		const el = this.contentEl

		// prompt label
		el.createDiv({}, el => {
			el.createSpan({ text: "Delete " })
			el.createSpan({ text: this.path, attr: { "style": "font-weight: bold" } })
			el.createSpan({ text: ` ${this.location === "local" ? "locally" : "on remote"}?` })
		})

		// buttons
		el.createDiv({}, el => {
			el.setCssStyles({
				marginTop: "15px",
				display: "flex",
				justifyContent: "flex-end",
				gap: "10px",
			})
			el.createEl("button", {}, el => {
				el.setText("Cancel")
				el.addEventListener("click", () => this.close())
			})
			el.createEl("button", {}, el => {
				el.setText("Delete")
				el.addClass("mod-warning")
				el.addEventListener("click", () => {
					this.close()
					this.callback()
				})
			})
		})
	}

	onClose() {
		this.contentEl.empty()
	}
}