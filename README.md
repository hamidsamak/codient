# Codient – CLI AI Code Assistant

Codient is a powerful **command-line AI coding assistant** powered by **Claude, ChatGPT, and DeepSeek**, designed to analyze, refactor, debug, and generate code directly from your terminal.

It works by sending your codebase to an automated AI pipeline (Selenium-based browser session) and returning structured results, including safe file updates, diffs, backups, and rollback support.

---

## ✨ Features

- 🤖 Multi-model AI support (Claude, ChatGPT, DeepSeek)
- 📂 Multi-file project support
- 🧠 Context-aware prompting system
- 💾 Safe overwrite mode with automatic backups
- 🔄 File history & rollback system
- 📊 HTML diff reports (visual comparison)
- 🐛 Debug mode (full prompt + response logging)
- 🌐 Browser automation session (persistent login)
- 🌐 Proxy support (HTTP / SOCKS5)
- 👤 Multi-profile Chrome support (separate sessions per account)
- 🔁 Multi-round AI conversation (automatic file request handling, up to 5 rounds)

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/hamidsamak/codient.git
cd codient
```

---

### 2. Create virtual environment and install dependencies

```bash
python3 -m venv venv
venv/bin/pip install -r requirements.txt
```

Make sure you also have:

- Python 3.8+
- Google Chrome
- ChromeDriver (matching your Chrome version)

---

### 3. Add to PATH (run from inside the cloned folder)

```bash
cat > ~/.local/bin/codient << EOF
#!/bin/bash
exec "$(pwd)/venv/bin/python" "$(pwd)/codient" "\$@"
EOF
chmod +x ~/.local/bin/codient
```

> Make sure `~/.local/bin` is in your PATH:
> ```bash
> echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc
> ```

---

### 4. Login to AI models

Before first use, open a browser session for each model you want to use and log in:

```bash
codient --browser --model claude
codient --browser --model chatgpt
codient --browser --model deepseek
```

> You only need to do this once per model. The session will be saved for future use.

---

## ⚙️ Usage

### Basic usage

```bash
codient "Fix this code" file1.py file2.py
```

> Default model is **DeepSeek**. Use `--model` to switch.

---

### With overwrite (auto-save changes)

```bash
codient --overwrite "Refactor this code" main.py
```

---

### Using context files (read-only reference)

```bash
codient "Improve architecture" --context utils.py config.py -- main.py
```

> `--` marks the end of context files. Files listed after it are editable targets.

---

### Enable debug mode

```bash
codient --debug "Explain this code" app.py
```

---

### Open browser session

```bash
codient --browser
```

---

### Select AI model

```bash
codient --model claude "Fix this code" app.py
codient --model chatgpt "Refactor this" main.py
codient --model deepseek "Optimize this" utils.py
```

---

## 🔁 Multi-round AI Conversation

If the AI needs additional files to complete the task, it will automatically request them using a `<need_more_info>` signal. Codient handles this interactively:

1. The AI responds with the files it needs and why
2. Codient looks for those files automatically in the current directory
3. If a file is not found, you are prompted to enter its path manually
4. The files are sent as a follow-up and the AI continues

This loop repeats up to **5 rounds** until the AI provides a complete response.

```
🔍 AI needs more information (round 1):
   Reason: Need to see the database schema
   Requested files: models.py, schema.sql

   ✅ Found: models.py
   ⚠️  File not found automatically: schema.sql
   📂 Enter full path for 'schema.sql' (or press Enter to skip): /home/user/project/schema.sql
   ✅ Loaded: /home/user/project/schema.sql
```

---

## 👤 Profiles

Profiles let you maintain **separate Chrome sessions** for different accounts or purposes — for example a work account on Claude and a personal account on ChatGPT.

Each profile has its own isolated browser session stored under:

```bash
~/.codient/profiles/<name>/
```

### Login with a specific profile

```bash
codient --browser --profile work
codient --browser --profile personal
```

### Use a profile for AI commands

```bash
codient --profile work "Fix this code" app.py
codient --profile personal --model claude "Refactor this" main.py
```

### List all existing profiles

```bash
codient --list-profiles
```

If `--profile` is not specified, the `default` profile is used automatically.

> Profile names can only contain letters, numbers, dashes, and underscores.

---

## 🧩 CLI Options

| Flag | Description |
|------|------------|
| `--overwrite` | Directly apply AI changes to files (with backup) |
| `--context` | Add reference files (not modified) |
| `--` | End of context files list; files after this are editable targets |
| `--debug` | Save prompt + response HTML for debugging |
| `--proxy` | Use HTTP/SOCKS5 proxy |
| `--model` | Select AI model: `claude`, `chatgpt`, `deepseek` (default: `deepseek`) |
| `--profile` | Chrome profile to use (default: `default`) |
| `--browser` | Open persistent login session |
| `--list-profiles` | List all existing profiles |
| `--history FILE` | Show backup history |
| `--rollback FILE` | Restore previous file version |
| `--timestamp` | Restore specific version |

---

## 💾 Backup System

Before any modification, files are automatically backed up:

```bash
~/.codient/backups/
```

Files in subdirectories are backed up with their relative path preserved. You can safely rollback anytime.

---

## 🔄 Rollback Example

```bash
codient --rollback main.py
```

Or specific version:

```bash
codient --rollback main.py --timestamp 20250101123000
```

---

## 📊 Diff Mode

If `--overwrite` is NOT used:

- No files are modified
- A visual HTML diff report is generated and saved to `~/.codient/reports/`
- Automatically opens in browser

---

## 🐛 Debug Mode

```bash
codient --debug "Fix bug" app.py
```

Outputs:

- Full AI prompt
- Raw AI response
- HTML debug logs

Stored in:

```bash
~/.codient/debug/
```

---

## 🌐 Architecture

```text
CLI Command
   ↓
Python Engine
   ↓
Selenium Automation
   ↓
AI Web UI (Claude / ChatGPT / DeepSeek)
   ↓
AI Response Parsing
   ↓  (if AI requests more files → follow-up loop, max 5 rounds)
File System Update / Diff / Backup
```

---

## ⚠️ Requirements

- Python 3.8+
- Google Chrome
- ChromeDriver
- Internet connection
- Access to Claude, ChatGPT, or DeepSeek