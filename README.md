# Copy Note Content (Obsidian plugin)

Copy the full **raw Markdown** of the currently-open note to your clipboard.

This plugin is designed to work well on **Obsidian Mobile** (where you can add commands to the toolbar), and also adds a **desktop ribbon icon** for quick access.

## Features

- Copy the full raw text of the active Markdown note (`.md`) to clipboard.
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
