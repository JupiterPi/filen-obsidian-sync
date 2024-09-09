import { App, Modal } from "obsidian"

export class ConfirmDeleteDialog extends Modal {
	constructor(
		app: App,
		private readonly path: string,
		private readonly location: "local" | "remote",
		private readonly confirmCallback: () => Promise<void>,
		private readonly onCloseCallback: () => void,
	) {
		super(app)
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
				el.addEventListener("click", () => this.confirmCallback().then(() => this.close()))
			})
		})
	}

	onClose() {
		this.onCloseCallback()
		this.contentEl.empty()
	}
}