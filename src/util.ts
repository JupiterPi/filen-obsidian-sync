import { Notice } from "obsidian"

/**
 * Displays a toast message.
 */
export function toast(msg: string) {
	new Notice(msg, 2000)
}