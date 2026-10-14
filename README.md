# Codient – AI Code Assistant for VS Code

Codient is a standalone Visual Studio Code extension that brings **Claude, ChatGPT, Gemini, and DeepSeek** into your editor to analyze, refactor, debug, and generate code directly from your workspace.

It is built for real-world development workflows: multi-file analysis, safe edits with automatic backups, change preview, and persistent browser-based sessions.

![Codient demo](https://raw.githubusercontent.com/hamidsamak/codient/main/docs/demo.gif)

[Installation](#installation) · [Features](#features) · [Chat](#chat) · [Commands](#commands) · [Settings](#settings) · [Profiles](#profiles)

---

## Installation

Install Codient from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=hamidsamak.codient), or search for **Codient** in the Extensions view (`Ctrl+Shift+X`).

You can also download the latest `.vsix` from the [Releases](https://github.com/hamidsamak/codient/releases) page and install it with:

```bash
code --install-extension codient-*.vsix
```

---

## Features

- 🤖 Multi-model AI support (Claude, ChatGPT, Gemini, DeepSeek)
- 💬 Sidebar chat view with a keyboard shortcut
- 📂 Analyze and edit single or multiple files
- 📌 Preselect the files to edit, with a clear-selection button
- 🔍 Read-only shell commands for project exploration before edits
- 💾 Safe overwrite mode with automatic backups
- 👁️ Preview changes before applying them
- 🔁 Retry button for failed messages
- 📝 Prompt draft is preserved when the webview reloads
- 🌐 Browser session mode (persistent login)
- 👤 Multi-profile Chrome support (separate sessions per account)
- 🛰️ Proxy support (HTTP / SOCKS5)
- 🎛️ Configurable file extensions and excluded directories

---

## Chat

Open the Codient chat from the activity bar, or press:

- Windows/Linux: `Ctrl + Shift + C`
- Mac: `Cmd + Alt + C`

From the chat you can write a prompt, choose the files to edit, send the request, and retry if a message fails. Your unsent prompt is kept even if the view reloads.

---

## Commands

Open the Command Palette:

- Windows/Linux: `Ctrl + Shift + P`
- Mac: `Cmd + Shift + P`

Then use one of the following commands. `Ask AI` and `Preview Changes` are also available from the editor and Explorer context menus.

### Codient: Open Chat

Opens the Codient chat view in the sidebar.

### Codient: Ask AI

Analyze and edit files using AI. Changes are applied directly, with automatic backup.

Use this for:
- Bug fixing
- Code review
- Optimization suggestions
- Adding comments or improvements

### Codient: Preview Changes

Same as Ask AI but without modifying files, so you can review the suggested changes first.

Use this for:
- Reviewing AI suggestions before applying
- Safe exploration of refactoring ideas

### Codient: Open Browser Session

Opens a persistent AI web session in Chrome using the **currently active profile** (set via Settings or `Codient: Switch Profile`).

Use this for:
- Logging in to AI accounts
- Manual AI interaction
- Login-based workflows

> To log in with a different profile, first run `Codient: Switch Profile`, then open the browser session.

### Codient: Switch Profile

Interactively switch between Chrome profiles.

- Shows a list of all existing profiles from `~/.codient/profiles/`
- Lets you type a new profile name to create one on the fly
- Updates the `codient.profile` setting globally

Use this for:
- Switching between work and personal accounts
- Managing multiple AI accounts per model

### Codient: Switch Model

Interactively switch the AI model (Claude, ChatGPT, Gemini, DeepSeek).

### Codient: Set Chat ID / Clear Chat ID / Chat ID Options

Set or clear a chat ID so requests continue in a specific conversation. `Chat ID Options` opens a menu for both actions.

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `codient.model` | `Default` | AI model to use: `Default`, `Claude`, `ChatGPT`, `Gemini`, `DeepSeek` |
| `codient.profile` | `default` | Chrome profile to use. Use `Codient: Switch Profile` to change interactively. |
| `codient.proxy` | `` | Proxy address (e.g. `http://127.0.0.1:8080` or `socks5://127.0.0.1:1080`). Leave empty to disable. |
| `codient.codeExtensions` | `.py`, `.js`, `.ts`, `.jsx`, `.tsx`, `.java`, `.cpp`, `.c`, `.go`, `.rs`, `.php`, `.rb`, `.html`, `.css`, `.scss`, `.sass`, `.less`, `.json` | File extensions to include when scanning for code files. |
| `codient.excludeDirs` | `node_modules`, `.git`, `dist`, `build`, `__pycache__`, `venv`, `env`, `.venv` | Directory names to exclude when scanning for code files. |

To restrict a large project to certain files, override the arrays in your workspace `.vscode/settings.json`:

```json
{
  "codient.codeExtensions": [".php"],
  "codient.excludeDirs": ["vendor", "storage", "node_modules", ".git"]
}
```

---

## Profiles

Profiles let you maintain **separate Chrome sessions** for different accounts or purposes.

Each profile is stored under:

```
~/.codient/profiles/<name>/
```

**Typical workflow:**

```
1. Codient: Switch Profile → select "work"
2. Codient: Open Browser Session → log in with your work account
3. Codient: Ask AI → runs with the work profile automatically
```

You can have as many profiles as you need: `default`, `work`, `personal`, `client-x`, etc.

---

## Contributing

Build and development instructions are in [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT