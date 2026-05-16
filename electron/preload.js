const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 存储路径管理
  getStorageRoot: () => ipcRenderer.invoke('get-storage-root'),
  setStorageRoot: (path) => ipcRenderer.invoke('set-storage-root', path),
  resetStorageRoot: () => ipcRenderer.invoke('reset-storage-root'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getStorageInfo: () => ipcRenderer.invoke('get-storage-info'),

  // 文件操作
  readFile: (relativePath) => ipcRenderer.invoke('read-file', relativePath),
  writeFile: (relativePath, content) => ipcRenderer.invoke('write-file', relativePath, content),
  writeBinaryFile: (relativePath, base64Data) => ipcRenderer.invoke('write-binary-file', relativePath, base64Data),
  deleteFile: (relativePath) => ipcRenderer.invoke('delete-file', relativePath),
  listDir: (relativePath) => ipcRenderer.invoke('list-dir', relativePath),
});
