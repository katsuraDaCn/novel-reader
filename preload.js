'use strict';

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // 拖拽进来的文件需要通过 webUtils 取真实路径
  pathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch (_) {
      return '';
    }
  },
  getLibrary: () => ipcRenderer.invoke('library:get'),
  getHiddenLibrary: () => ipcRenderer.invoke('library:getHidden'),
  importDialog: () => ipcRenderer.invoke('books:importDialog'),
  importPaths: (paths) => ipcRenderer.invoke('books:importPaths', paths),
  getBook: (id) => ipcRenderer.invoke('book:get', id),
  saveProgress: (id, progress) => ipcRenderer.invoke('progress:save', id, progress),
  deleteBook: (id) => ipcRenderer.invoke('book:delete', id),
  hideBook: (id, hidden) => ipcRenderer.invoke('books:hide', id, hidden),
  reorderBooks: (orderedIds) => ipcRenderer.invoke('books:reorder', orderedIds),

  // 隐私书架
  securityStatus: () => ipcRenderer.invoke('security:status'),
  securitySetup: (payload) => ipcRenderer.invoke('security:setup', payload),
  securityUnlock: (password) => ipcRenderer.invoke('security:unlock', password),
  securityLock: () => ipcRenderer.invoke('security:lock'),
  securityChange: (payload) => ipcRenderer.invoke('security:change', payload),
});
