import { Notice } from "obsidian"

/**
 * Displays a toast message.
 */
export function notice(msg: string) {
	new Notice(msg, 2000)
}