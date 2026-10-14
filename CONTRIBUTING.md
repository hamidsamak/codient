# Contributing

## Development setup

```bash
git clone https://github.com/hamidsamak/codient.git
cd codient
npm install
```

Press `F5` in VS Code to launch an Extension Development Host with Codient loaded.

## Build a .vsix package

```bash
npm install -g @vscode/vsce
vsce package
```

## Install locally

```bash
code --install-extension codient-*.vsix
```