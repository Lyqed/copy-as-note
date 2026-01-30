/**
 * Copy As Note (Obsidian plugin)
 *
 * Mobile workflow:
 * - This plugin exposes a command that can be manually added to the Obsidian Mobile toolbar.
 * Desktop workflow:
 * - Adds a ribbon icon for quick access.
 */

const { Plugin, Notice } = require('obsidian');

module.exports = class MobileCopyNotePlugin extends Plugin {
	async onload() {
		// Obsidian Mobile toolbar rules: expose a command that the user can add manually.
		this.addCommand({
			id: 'copy-active-note-to-clipboard',
			name: 'Copy current note to clipboard',
			icon: 'copy',
			callback: async () => {
				await this.copyCurrentNoteToClipboard();
			},
		});

		// Desktop convenience: show a ribbon icon (left sidebar) that runs the same action.
		this.addRibbonIcon('copy', 'Copy current note to clipboard', async () => {
			await this.copyCurrentNoteToClipboard();
		});
	}

	async copyCurrentNoteToClipboard() {
		const activeFile = this.app.workspace.getActiveFile();

		if (!activeFile) {
			new Notice('No active note to copy.');
			return;
		}

		if (activeFile.extension !== 'md') {
			new Notice('Active file is not a markdown note.');
			return;
		}

		let content;
		try {
			// Read raw file text from the vault (not rendered/preview content)
			content = await this.app.vault.read(activeFile);
		} catch (error) {
			console.error('Copy As Note: Failed to read active file', error);
			new Notice('Failed to read current note.');
			return;
		}

		const copied = await this.tryCopyTextToClipboard(content);
		if (copied) {
			new Notice('Copied current note to clipboard.');
		} else {
			new Notice('Failed to copy note to clipboard.');
		}
	}

	async tryCopyTextToClipboard(text) {
		// Strategy 1: Standard Web Clipboard API (preferred)
		try {
			if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(text);
				return true;
			}
		} catch (error) {
			console.warn('Copy As Note: navigator.clipboard.writeText failed', error);
		}

		// Strategy 2: Obsidian clipboard API (if available)
		try {
			const obsidianClipboard = this.app && this.app.clipboard;
			if (obsidianClipboard && obsidianClipboard.writeText) {
				await obsidianClipboard.writeText(text);
				return true;
			}
		} catch (error) {
			console.warn('Copy As Note: app.clipboard.writeText failed', error);
		}

		// Strategy 3: Legacy execCommand fallback
		try {
			const textarea = document.createElement('textarea');
			textarea.value = text;
			textarea.setAttribute('readonly', '');
			textarea.style.position = 'fixed';
			textarea.style.left = '-9999px';
			textarea.style.top = '0';
			textarea.style.opacity = '0';

			document.body.appendChild(textarea);
			textarea.focus();
			textarea.select();
			textarea.setSelectionRange(0, textarea.value.length);

			const ok = document.execCommand && document.execCommand('copy');
			document.body.removeChild(textarea);
			return !!ok;
		} catch (error) {
			console.warn('Copy As Note: execCommand copy fallback failed', error);
			return false;
		}
	}

	onunload() {
		// No UI elements to clean up; command registration is handled by Obsidian.
	}
};



