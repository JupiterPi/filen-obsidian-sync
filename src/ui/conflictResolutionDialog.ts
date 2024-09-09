import { App, Modal } from "obsidian"
import { diffLines } from "diff"

export class ConflictResolutionDialog extends Modal {
	constructor(
		app: App,
		private readonly path: string,
		private readonly localVersion: string,
		private readonly remoteVersion: string,
		private readonly acceptLocal: () => Promise<void>,
		private readonly acceptRemote: () => Promise<void>,
		private readonly resolveManually: (resolution: string) => Promise<void>,
		private readonly onCloseCallback: () => void,
	) {
		super(app)
	}

	onOpen() {
		this.modalEl.setCssStyles({
			width: "85vw"
		})

		const el = this.contentEl

		el.createDiv({}, el => {  // header
			el.createSpan({ text: `Resolve sync conflict for ` })
			el.createSpan({ text: this.path, attr: { "style": "font-weight: bold" } })
		})

		el.createDiv({}, el => { // compare view container
			const borderStyle = "1px solid rgba(255, 255, 255, 0.4)"
			el.setCssStyles({
				marginTop: "15px",
				width: "100%",
				alignContent: "stretch",
				borderCollapse: "collapse",

				display: "flex",
				flexDirection: "column",

				border: borderStyle,
				borderRadius: "6px",
			})

			el.createDiv({}, el => { // file headers container
				el.setCssStyles({
					display: "flex",
				})

				for (const isLocal of [true, false]) {
					el.createDiv({}, el => { // file headers
						el.setCssStyles({
							flex: "1",
							borderBottom: borderStyle,
							padding: "7px 10px",
						})
						el.setText(isLocal ? "Local" : "Remote")
					})
				}
			})

			const diff = diffLines(this.localVersion, this.remoteVersion)
			el.createDiv({}, el => { // files container
				el.setCssStyles({
					display: "flex",
					maxHeight: "70vh",
					overflowY: "auto",
					paddingBottom: "10px",
				})

				for (const isLocal of [true, false]) {
					el.createDiv({}, el => { // file container
						el.setCssStyles({
							flex: "1",
							paddingTop: "7px",
						})

						for (const change of diff) { // line
							el.createDiv({}, el => {
								el.setText(change.value)
								el.setCssStyles({
									padding: "0 10px",
									whiteSpace: "pre-wrap",
									opacity: (isLocal ? !change.added : !change.removed) ? "1" : "0",
									background: ((isLocal && change.removed) || (!isLocal && change.added)) ? "hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.4)" : "none",
								})
							})
						}
					})
				}
			})
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
				el.setText("Skip for now")
				el.addEventListener("click", () => this.close())
			})
			el.createEl("button", {}, el => {
				el.setText("Accept Local")
				el.setCssStyles({ background: "var(--color-accent)" })
				el.addEventListener("click", () => this.acceptLocal().then(() => this.close()))
			})
			el.createEl("button", {}, el => {
				el.setText("Accept Remote")
				el.setCssStyles({ background: "var(--color-accent)" })
				el.addEventListener("click", () => this.acceptRemote().then(() => this.close()))
			})
			el.createEl("button", {}, el => {
				el.setText("Resolve Manually")
				el.setCssStyles({ background: "var(--color-accent)" })
				el.addEventListener("click", () => this.close())
			})
		})
	}

	onClose() {
		this.onCloseCallback()
		this.contentEl.empty()
	}
}