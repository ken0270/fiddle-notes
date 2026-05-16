<div align="center">

# 🗒️ Fiddle Notes

**懒人笔记 — 优雅的离线 Markdown 笔记应用**  
**An elegant offline Markdown note-taking app**

[![Electron](https://img.shields.io/badge/Electron-28-blue?logo=electron)](https://www.electronjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-WASM-003B57?logo=sqlite)](https://sql.js.org/)
[![License](https://img.shields.io/badge/License-ISC-green)]()

![Preview](public/icon.png)

</div>

---

<p align="center">
  <a href="#中文">中文</a> •
  <a href="#english">English</a>
</p>

---

<a name="中文"></a>

# 📖 中文

## 🚀 简介

**懒人笔记** 是一款离线可用的 Markdown 笔记应用，基于 SQLite + 文件系统混合存储。支持笔记管理、标签分类、Markdown 实时预览、模板系统、附件管理、图片粘贴、数据导入导出等功能。可构建为 Windows 桌面安装包（Electron）。

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 📝 笔记管理 | 新建、编辑、自动保存、删除、复制 |
| 🔍 全文搜索 | 实时搜索，结果高亮预览 |
| 🏷️ 标签系统 | 创建/删除标签，按标签筛选笔记 |
| 📄 Markdown 编辑 | 工具栏 + 快捷键，支持代码高亮、KaTeX 公式、Mermaid 图表 |
| 👁️ 实时预览 | 分栏/纯编辑/纯预览三种视图，可拖拽调整比例 |
| 📋 模板系统 | 预置空白笔记模板，支持自定义模板 |
| 📎 附件管理 | 上传/拖拽/粘贴文件，图片预览，附件下载 |
| 🖼️ 图片粘贴 | Ctrl+V 直接粘贴图片，自动保存 |
| 💾 文件系统同步 | 笔记可导出为独立 `.md` 文件到本地目录 |
| 📦 数据导入导出 | JSON 格式导出/导入，支持合并导入 |
| 🌗 主题切换 | 亮色/深色主题 |
| 🖥️ 桌面打包 | Electron + NSIS 安装包，离线可用 |

## 🛠️ 快速开始

### 开发模式

```bash
# 安装依赖
npm install

# 启动 Vite 开发服务器
npm run dev
# → http://localhost:3000
```

### 桌面模式

```bash
# Electron 开发模式（需先启动 Vite）
npm run dev           # 终端1
npm run dev:electron  # 终端2

# 生成安装包
npm run build:electron
# → release-build/懒人笔记-Setup-1.0.0.exe
```

## 📁 项目结构

```
fiddlenotes/
├── index.html               # 应用入口
├── package.json              # 项目配置
├── vite.config.js            # Vite 构建配置
├── src/                      # 源代码
│   ├── main.js               # 入口 JS
│   ├── app.js                # 核心应用逻辑 (NoteApp)
│   ├── db.js                 # SQLite 数据库层 (NotesDB)
│   └── styles.css            # 全部样式
├── electron/                 # Electron 桌面端
│   ├── main.js               # 主进程
│   └── preload.js            # IPC 预加载脚本
├── scripts/                  # 构建脚本
│   ├── build-electron.mjs    # 打包脚本
│   └── generate-icon.mjs     # 图标生成
└── public/
    └── icon.png              # 应用图标
```

## 🏗️ 技术栈

| 技术 | 用途 |
|------|------|
| **Vite 5** | 前端构建与开发服务器 |
| **SQL.js** | 浏览器端 SQLite（WASM） |
| **Marked 12** | Markdown → HTML 渲染 |
| **CodeMirror 6** | Markdown 代码编辑器 |
| **Highlight.js** | 代码语法高亮 |
| **KaTeX** | 数学公式渲染 |
| **Mermaid** | 图表渲染（流程图、时序图等） |
| **File System Access API** | 浏览器本地文件夹读写 |
| **Electron 28** | 桌面应用容器 |
| **electron-builder 24** | 安装包生成（NSIS） |

## 📦 构建

```bash
npm run build            # Vite 生产构建
npm run build:electron   # 完整构建 + 安装包
```

构建流程：
1. **Vite build** → 生成 `dist/`
2. **复制 sql.js** → 离线 WASM 支持
3. **Patch index.html** → 替换 CDN 为本地引用
4. **electron-builder** → 生成 NSIS 安装包

## 📄 许可证

ISC

---

<a name="english"></a>

# 📖 English

## 🚀 Introduction

**Fiddle Notes** (懒人笔记 / Lazy Notes) is an offline-capable Markdown note-taking app with a hybrid SQLite + filesystem storage architecture. It features note management, tagging, Markdown live preview, template system, attachments, image paste, data import/export, and can be packaged as a Windows desktop installer via Electron.

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📝 Notes CRUD | Create, edit, auto-save, delete, duplicate |
| 🔍 Full-text Search | Real-time search with highlighted results |
| 🏷️ Tag System | Create/delete tags, filter notes by tag |
| 📄 Markdown Editor | Toolbar + shortcuts, code highlighting, KaTeX formulas, Mermaid diagrams |
| 👁️ Live Preview | Split/Edit/Preview modes, resizable panes |
| 📋 Templates | Built-in blank template, supports custom templates |
| 📎 Attachments | Upload/drag-drop/paste files, image preview, download |
| 🖼️ Image Paste | Ctrl+V to paste images directly, auto-saved |
| 💾 Filesystem Sync | Export notes as standalone `.md` files |
| 📦 Data Import/Export | JSON format, supports merge import |
| 🌗 Theme Toggle | Light/Dark theme |
| 🖥️ Desktop Package | Electron + NSIS installer, fully offline |

## 🛠️ Quick Start

### Development

```bash
npm install
npm run dev
# → http://localhost:3000
```

### Desktop

```bash
# Electron dev mode (start Vite first)
npm run dev           # Terminal 1
npm run dev:electron  # Terminal 2

# Build installer
npm run build:electron
# → release-build/懒人笔记-Setup-1.0.0.exe
```

## 📁 Project Structure

```
fiddlenotes/
├── index.html               # App entry HTML
├── package.json              # Dependencies & config
├── vite.config.js            # Vite config
├── src/                      # Source code
│   ├── main.js               # Entry JS
│   ├── app.js                # Core app logic (NoteApp)
│   ├── db.js                 # SQLite database layer (NotesDB)
│   └── styles.css            # All styles
├── electron/                 # Electron
│   ├── main.js               # Main process
│   └── preload.js            # Preload script (IPC bridge)
├── scripts/                  # Build scripts
│   ├── build-electron.mjs    # Pack script
│   └── generate-icon.mjs     # Icon generator
└── public/
    └── icon.png              # App icon
```

## 🏗️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Vite 5** | Build tool & dev server |
| **SQL.js** | Browser-side SQLite (WASM) |
| **Marked 12** | Markdown → HTML renderer |
| **CodeMirror 6** | Markdown code editor |
| **Highlight.js** | Syntax highlighting |
| **KaTeX** | Math formula rendering |
| **Mermaid** | Diagram rendering (flowcharts, sequence diagrams, etc.) |
| **File System Access API** | Local folder read/write in browser |
| **Electron 28** | Desktop app container |
| **electron-builder 24** | Installer generation (NSIS) |

## 📦 Build

```bash
npm run build            # Vite production build
npm run build:electron   # Full build + installer
```

Build pipeline:
1. **Vite build** → `dist/`
2. **Copy sql.js** → offline WASM support
3. **Patch index.html** → replace CDN with local files
4. **electron-builder** → NSIS installer

## 📄 License

ISC
