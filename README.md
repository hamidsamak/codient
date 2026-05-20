# Deep Insight – CLI AI Code Assistant (DeepSeek Powered)

Deep Insight is a powerful **command-line AI coding assistant** powered by **DeepSeek AI**, designed to analyze, refactor, debug, and generate code directly from your terminal.

It works by sending your codebase to an automated AI pipeline (Selenium-based DeepSeek session) and returning structured results, including safe file updates, diffs, backups, and rollback support.

---

## ✨ Features

- 🤖 DeepSeek AI powered code analysis & generation
- 📂 Multi-file project support
- 🧠 Context-aware prompting system
- 💾 Safe overwrite mode with automatic backups
- 🔄 File history & rollback system
- 📊 HTML diff reports (visual comparison)
- 🐛 Debug mode (full prompt + response logging)
- 🌐 Browser automation session (persistent login)
- 🌐 Proxy support (HTTP / SOCKS5)

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/hamidsamak/deep-insight.git
cd deep-insight
```

---

### 2. Install dependencies

```bash
pip install selenium
```

Make sure you also have:

- Python 3.8+
- Google Chrome
- ChromeDriver (matching your Chrome version)

---

## ⚙️ Usage

### Basic usage

```bash
deep-insight "Fix this code" file1.py file2.py
```

---

### With overwrite (auto-save changes)

```bash
deep-insight --overwrite "Refactor this code" main.py
```

---

### Using context files (read-only reference)

```bash
deep-insight "Improve architecture" --context utils.py config.py -- main.py
```

---

### Enable debug mode

```bash
deep-insight --debug "Explain this code" app.py
```

---

### Open browser session

```bash
deep-insight --browser
```

---

## 🧩 CLI Options

| Flag | Description |
|------|------------|
| `--overwrite` | Directly apply AI changes to files (with backup) |
| `--context` | Add reference files (not modified) |
| `--debug` | Save prompt + response HTML for debugging |
| `--proxy` | Use HTTP/SOCKS5 proxy |
| `--browser` | Open persistent login session |
| `--history FILE` | Show backup history |
| `--rollback FILE` | Restore previous file version |
| `--timestamp` | Restore specific version |

---

## 💾 Backup System

Before any modification, files are automatically backed up:

```bash
~/.deep-insight/backups/
```

You can safely rollback anytime.

---

## 🔄 Rollback Example

```bash
deep-insight --rollback main.py
```

Or specific version:

```bash
deep-insight --rollback main.py --timestamp 20250101123000
```

---

## 📊 Diff Mode

If `--overwrite` is NOT used:

- No files are modified
- A visual HTML diff report is generated
- Automatically opens in browser

---

## 🐛 Debug Mode

```bash
deep-insight --debug "Fix bug" app.py
```

Outputs:

- Full AI prompt
- Raw DeepSeek response
- HTML debug logs

Stored in:

```bash
~/.deep-insight/debug/
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
DeepSeek Web UI
   ↓
AI Response Parsing
   ↓
File System Update / Diff / Backup
```

---

## ⚠️ Requirements

- Python 3.8+
- Google Chrome
- ChromeDriver
- Internet connection
- DeepSeek access