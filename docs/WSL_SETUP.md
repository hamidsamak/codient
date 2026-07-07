# WSL Ubuntu Setup Guide

This guide covers extra steps needed to run Codient on **WSL Ubuntu**, since Chrome and some system packages aren't preinstalled.

## 1. Install Google Chrome

```bash
sudo apt update -y
sudo apt install -y wget gnupg

wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list

sudo apt update -y
sudo apt install -y google-chrome-stable

google-chrome --version
which google-chrome
```

## 2. Install ChromeDriver (matching your Chrome version)

Since `chromium-chromedriver` from apt often doesn't match the exact version of `google-chrome-stable`, it's more reliable to download the matching ChromeDriver build directly from Google's official Chrome for Testing repository.

### 2.1. Install Python venv support

Ubuntu ships a version-specific venv package (e.g. `python3.12-venv`), so detect the installed Python version dynamically instead of hardcoding it:

```bash
PY_VER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
sudo apt install -y "python${PY_VER}-venv" unzip
```

### 2.2. Get your installed Chrome version

```bash
CHROME_VERSION=$(google-chrome --version | grep -oP '\d+\.\d+\.\d+\.\d+')
echo "Detected Chrome version: $CHROME_VERSION"
```

### 2.3. Download the matching ChromeDriver build

```bash
cd /tmp
wget -q "https://storage.googleapis.com/chrome-for-testing-public/${CHROME_VERSION}/linux64/chromedriver-linux64.zip"
unzip -o chromedriver-linux64.zip
```

> If the exact version isn't found (404), check available builds at:
> https://googlechromelabs.github.io/chrome-for-testing/#stable
> and use the closest matching version instead.

### 2.4. Move the binary into PATH

```bash
sudo mv /tmp/chromedriver-linux64/chromedriver /usr/local/bin/chromedriver
sudo chmod +x /usr/local/bin/chromedriver

chromedriver --version
```

### 2.5. Clean up

```bash
rm -rf /tmp/chromedriver-linux64 /tmp/chromedriver-linux64.zip
```

> ⚠️ Whenever Chrome auto-updates, `chromedriver` may fall out of sync and Selenium will throw a version-mismatch error. If that happens, repeat steps 2.2–2.4 to fetch the new matching version.

## 3. Continue with the main installation

Once Chrome and ChromeDriver are installed, follow the standard [Installation](../README.md#-installation) steps in the main README (clone repo, create venv, add to PATH, login).