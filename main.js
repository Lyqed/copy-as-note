/**
 * Copy As Note (Obsidian plugin)
 *
 * Mobile workflow:
 * - This plugin exposes a command that can be manually added to the Obsidian Mobile toolbar.
 * Desktop workflow:
 * - Adds a ribbon icon for quick access.
 */

const { Plugin, Notice, PluginSettingTab, Setting, TFolder, TFile } = require('obsidian');

const DEFAULT_SETTINGS = { includeMetadata: false };

module.exports = class MobileCopyNotePlugin extends Plugin {
	async onload() {
		await this.loadSettings();
		this.addSettingTab(new CopyAsNoteSettingTab(this.app, this));

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

		// Right-click context menu on folders (works on desktop and mobile).
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (file instanceof TFolder) {
					menu.addItem(item => {
						item.setTitle('Copy folder content')
							.setIcon('copy')
							.onClick(async () => {
								await this.copyFolderToClipboard(file);
							});
					});
				}
			})
		);
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

		// Strip YAML frontmatter unless user opted in
		if (!this.settings.includeMetadata) {
			content = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
		}

		// Prepend note title as H1
		const title = activeFile.basename;
		content = `# ${title}\n\n${content.trimStart()}`;

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

	collectMarkdownFiles(folder) {
		const files = [];
		for (const child of folder.children) {
			if (child instanceof TFile && child.extension === 'md') {
				files.push(child);
			} else if (child instanceof TFolder) {
				files.push(...this.collectMarkdownFiles(child));
			}
		}
		return files;
	}

	async copyFolderToClipboard(folder) {
		const files = this.collectMarkdownFiles(folder);
		if (files.length === 0) {
			new Notice('No markdown notes found in folder.');
			return;
		}

		files.sort((a, b) => a.path.localeCompare(b.path));

		const parts = [];
		for (const file of files) {
			let content;
			try {
				content = await this.app.vault.read(file);
			} catch (error) {
				console.error(`Copy As Note: Failed to read ${file.path}`, error);
				continue;
			}

			if (!this.settings.includeMetadata) {
				content = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
			}

			content = `# ${file.basename}\n\n${content.trimStart()}`;
			parts.push(content);
		}

		const combined = parts.join('\n\n---\n\n');
		const copied = await this.tryCopyTextToClipboard(combined);
		if (copied) {
			new Notice(`Copied ${parts.length} note${parts.length === 1 ? '' : 's'} to clipboard.`);
		} else {
			new Notice('Failed to copy folder content to clipboard.');
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		// No UI elements to clean up; command registration is handled by Obsidian.
	}
};

class CopyAsNoteSettingTab extends PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}
	display() {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl)
			.setName('Include note metadata')
			.setDesc('When enabled, YAML frontmatter is included in the copied text.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.includeMetadata)
				.onChange(async value => {
					this.plugin.settings.includeMetadata = value;
					await this.plugin.saveSettings();
				}));
	}
}



