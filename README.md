# Copy Note Content (Obsidian plugin)

Copy the full **raw Markdown** of the currently-open note to your clipboard.

This plugin is designed to work well on **Obsidian Mobile** (where you can add commands to the toolbar), and also adds a **desktop ribbon icon** for quick access.

## Features

- Copy the full raw text of the active Markdown note (`.md`) to clipboard.
- Right-click a note, a multi-file selection, or a folder to copy them.
- Each copied note has its title prepended as an H1; multiple notes are joined with a horizontal rule.
- Toggle to include or strip YAML frontmatter (Settings → Copy Note Content).
- Mobile-friendly: exposes a command that can be added to the mobile toolbar.
- Desktop-friendly: includes a ribbon icon in the left sidebar.

## How to use

### Mobile (recommended)

1. Open **Settings → Mobile**.
2. Under **Toolbar**, add the command:
   - **Copy current note to clipboard**
3. Tap the toolbar button to copy the current note.

### Desktop

- Click the ribbon icon (left sidebar) to copy the current note.
- Or run the command from the Command Palette:
  - **Copy current note to clipboard**
- Or right-click in the file explorer:
  - A single note → **Copy note to clipboard**
  - A multi-file selection → **Copy N notes to clipboard**
  - A folder → **Copy folder content** (recurses into subfolders)

## Notes / Limitations

- Only copies Markdown notes (`.md`).
- Copies the raw file content from the vault (not rendered preview).

## Installation

### From Community Plugins (once published)

1. Settings → Community plugins
2. Browse and search for **Copy Note Content**
3. Install and enable

### Manual

1. Download `main.js`, `manifest.json`, and (optionally) `styles.css` from the latest GitHub release.
2. Place them in: `YourVault/.obsidian/plugins/copy-as-note/`
3. Reload Obsidian and enable the plugin.

## License

MIT
