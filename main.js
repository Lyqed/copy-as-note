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

		// Right-click context menu on a single file or folder (desktop and mobile).
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
				} else if (file instanceof TFile && file.extension === 'md') {
					menu.addItem(item => {
						item.setTitle('Copy note to clipboard')
							.setIcon('copy')
							.onClick(async () => {
								await this.copyFilesToClipboard([file]);
							});
					});
				}
			})
		);

		// Right-click context menu on a multi-file selection (desktop).
		this.registerEvent(
			this.app.workspace.on('files-menu', (menu, files) => {
				const markdownFiles = files.filter(
					file => file instanceof TFile && file.extension === 'md'
				);
				if (markdownFiles.length === 0) {
					return;
				}
				menu.addItem(item => {
					item.setTitle(`Copy ${markdownFiles.length} notes to clipboard`)
						.setIcon('copy')
						.onClick(async () => {
							await this.copyFilesToClipboard(markdownFiles);
						});
				});
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

		const content = await this.formatNote(activeFile);
		if (content === null) {
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

	// Read a markdown file and format it for the clipboard: optional frontmatter
	// stripping, then the note title prepended as an H1. Returns null on read failure.
	async formatNote(file) {
		let content;
		try {
			// Read raw file text from the vault (not rendered/preview content)
			content = await this.app.vault.read(file);
		} catch (error) {
			console.error(`Copy As Note: Failed to read ${file.path}`, error);
			return null;
		}

		// Strip YAML frontmatter unless user opted in
		if (!this.settings.includeMetadata) {
			content = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
		}

		// Prepend note title as H1
		return `# ${file.basename}\n\n${content.trimStart()}`;
	}

	// Copy one or more markdown files to the clipboard, joined by a horizontal rule.
	async copyFilesToClipboard(files) {
		if (files.length === 0) {
			new Notice('No markdown notes to copy.');
			return;
		}

		const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));

		const parts = [];
		for (const file of sorted) {
			const content = await this.formatNote(file);
			if (content !== null) {
				parts.push(content);
			}
		}

		if (parts.length === 0) {
			new Notice('Failed to read selected notes.');
			return;
		}

		const combined = parts.join('\n\n---\n\n');
		const copied = await this.tryCopyTextToClipboard(combined);
		if (copied) {
			new Notice(`Copied ${parts.length} note${parts.length === 1 ? '' : 's'} to clipboard.`);
		} else {
			new Notice('Failed to copy notes to clipboard.');
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

		const parts = [`### ${folder.name} ###`];
		for (const file of files) {
			const content = await this.formatNote(file);
			if (content !== null) {
				parts.push(content);
			}
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



