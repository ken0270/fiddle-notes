const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// =======================
// 用户数据 & 配置管理
// =======================

/** 获取配置文件路径 */
function getConfigPath() {
  return path.join(app.getPath('userData'), 'fiddle-notes-config.json');
}

/** 读取配置 */
function loadConfig() {
  const configPath = getConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (e) {
    console.error('加载配置失败:', e);
  }
  return {};
}

/** 保存配置 */
function saveConfig(config) {
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
}

/** 获取当前存储根路径（默认 = 用户数据目录） */
function getStorageRoot() {
  const config = loadConfig();
  if (config.storageRoot) return config.storageRoot;
  const defaultRoot = path.join(app.getPath('userData'), 'data');
  return defaultRoot;
}

/** 确保子目录存在 */
function ensureDirs(rootPath) {
  for (const dir of ['notes', 'images', 'attachments']) {
    const fullPath = path.join(rootPath, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }
}

// =======================
// IPC 处理器
// =======================

/** 设置存储根路径 */
ipcMain.handle('set-storage-root', async (event, rootPath) => {
  const absPath = path.resolve(rootPath);
  ensureDirs(absPath);
  const config = loadConfig();
  config.storageRoot = absPath;
  saveConfig(config);
  return { success: true, path: absPath };
});

/** 获取存储根路径 */
ipcMain.handle('get-storage-root', async () => {
  const root = getStorageRoot();
  ensureDirs(root);
  return root;
});

/** 重置为默认路径（安装目录） */
ipcMain.handle('reset-storage-root', async () => {
  const config = loadConfig();
  delete config.storageRoot;
  saveConfig(config);
  const root = getStorageRoot();
  ensureDirs(root);
  return root;
});

/** 选择文件夹对话框 */
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择笔记存储路径'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0];
    ensureDirs(selectedPath);
    return selectedPath;
  }
  return null;
});

/** 读取文件（返回 Base64） */
ipcMain.handle('read-file', async (event, relativePath) => {
  const root = getStorageRoot();
  const fullPath = path.join(root, relativePath);
  try {
    const data = fs.readFileSync(fullPath);
    return { success: true, data: data.toString('base64'), ext: path.extname(fullPath) };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

/** 写入文件 */
ipcMain.handle('write-file', async (event, relativePath, content) => {
  const root = getStorageRoot();
  const fullPath = path.join(root, relativePath);
  try {
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

/** 写入二进制文件（Base64） */
ipcMain.handle('write-binary-file', async (event, relativePath, base64Data) => {
  const root = getStorageRoot();
  const fullPath = path.join(root, relativePath);
  try {
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(fullPath, buffer);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

/** 删除文件 */
ipcMain.handle('delete-file', async (event, relativePath) => {
  const root = getStorageRoot();
  const fullPath = path.join(root, relativePath);
  try {
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

/** 列出目录文件 */
ipcMain.handle('list-dir', async (event, relativePath) => {
  const root = getStorageRoot();
  const dirPath = path.join(root, relativePath);
  try {
    if (!fs.existsSync(dirPath)) return { success: true, files: [] };
    const files = fs.readdirSync(dirPath);
    return { success: true, files };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

/** 获取当前数据信息 */
ipcMain.handle('get-storage-info', async () => {
  const root = getStorageRoot();
  const config = loadConfig();
  const isCustom = !!config.storageRoot;
  let counts = { notes: 0, images: 0, attachments: 0 };
  for (const dir of ['notes', 'images', 'attachments']) {
    const dirPath = path.join(root, dir);
    if (fs.existsSync(dirPath)) {
      counts[dir] = fs.readdirSync(dirPath).length;
    }
  }
  return { root, isCustom, counts };
});

// =======================
// 应用窗口
// =======================

let mainWindow;

function createWindow() {
  // 确保初始目录存在
  ensureDirs(getStorageRoot());

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  // 开发模式用 Vite dev server，生产模式加载打包后的文件
  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
