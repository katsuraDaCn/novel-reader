'use strict';

const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { buildBook } = require('./lib/text');

// 数据（书架记录 + 书籍内容）存放在项目目录的 data/ 下，便于查看和备份
const DATA_DIR = path.join(__dirname, 'data');
const BOOKS_DIR = path.join(DATA_DIR, 'books');
const LIBRARY_FILE = path.join(DATA_DIR, 'library.json');

let mainWindow = null;

function ensureDirs() {
  fs.mkdirSync(BOOKS_DIR, { recursive: true });
}

function readLibrary() {
  try {
    return JSON.parse(fs.readFileSync(LIBRARY_FILE, 'utf8'));
  } catch (_) {
    return [];
  }
}

function writeLibrary(lib) {
  fs.writeFileSync(LIBRARY_FILE, JSON.stringify(lib, null, 2), 'utf8');
}

function importPaths(paths) {
  const lib = readLibrary();
  const added = [];
  let skipped = 0;
  for (const p of paths) {
    if (typeof p !== 'string' || !/\.txt$/i.test(p)) {
      skipped++;
      continue;
    }
    if (lib.some((m) => m.sourcePath === p)) {
      skipped++;
      continue;
    }
    try {
      const buf = fs.readFileSync(p);
      const book = buildBook(path.basename(p), buf);
      if (!book.chapters.length) {
        skipped++;
        continue;
      }
      const id = 'bk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      fs.writeFileSync(
        path.join(BOOKS_DIR, id + '.json'),
        JSON.stringify({ id, title: book.title, encoding: book.encoding, charCount: book.charCount, chapters: book.chapters })
      );
      const meta = {
        id,
        title: book.title,
        chapterCount: book.chapters.length,
        charCount: book.charCount,
        encoding: book.encoding,
        importedAt: Date.now(),
        sourcePath: p,
        chapterIdx: 0,
        scrollRatio: 0,
        lastReadAt: 0,
      };
      lib.push(meta);
      added.push(meta);
    } catch (err) {
      console.error('[导入失败]', p, err.message);
      skipped++;
    }
  }
  if (added.length) writeLibrary(lib);
  return { added, skipped };
}

function registerIpc() {
  ipcMain.handle('library:get', () => readLibrary());

  ipcMain.handle('books:importDialog', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: '选择小说文件',
      buttonLabel: '导入',
      filters: [{ name: '文本文档', extensions: ['txt'] }],
      properties: ['openFile', 'multiSelections'],
    });
    if (res.canceled || !res.filePaths.length) return { canceled: true, added: [], skipped: 0 };
    return { canceled: false, ...importPaths(res.filePaths) };
  });

  ipcMain.handle('books:importPaths', (_e, paths) => {
    if (!Array.isArray(paths)) return { added: [], skipped: 0 };
    return importPaths(paths);
  });

  ipcMain.handle('book:get', (_e, id) => {
    if (typeof id !== 'string' || !/^bk_[a-z0-9]+$/.test(id)) return null;
    try {
      return JSON.parse(fs.readFileSync(path.join(BOOKS_DIR, id + '.json'), 'utf8'));
    } catch (_) {
      return null;
    }
  });

  ipcMain.handle('progress:save', (_e, id, progress) => {
    if (typeof id !== 'string' || !progress || typeof progress !== 'object') return false;
    const lib = readLibrary();
    const meta = lib.find((m) => m.id === id);
    if (!meta) return false;
    const { chapterIdx, scrollRatio } = progress;
    if (Number.isInteger(chapterIdx) && chapterIdx >= 0 && meta.chapterCount > 0) {
      meta.chapterIdx = Math.min(chapterIdx, meta.chapterCount - 1);
    }
    if (typeof scrollRatio === 'number' && Number.isFinite(scrollRatio)) {
      meta.scrollRatio = Math.min(Math.max(scrollRatio, 0), 1);
    }
    meta.lastReadAt = Date.now();
    writeLibrary(lib);
    return true;
  });

  ipcMain.handle('book:delete', (_e, id) => {
    if (typeof id !== 'string') return false;
    const lib = readLibrary();
    const idx = lib.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    lib.splice(idx, 1);
    writeLibrary(lib);
    try {
      fs.unlinkSync(path.join(BOOKS_DIR, id + '.json'));
    } catch (_) {
      // 文件不存在则忽略
    }
    return true;
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 880,
    minHeight: 620,
    autoHideMenuBar: true,
    backgroundColor: '#ece3cd',
    title: '小说阅读器',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  // 把渲染进程的报错转发到主进程 stdout，便于自检
  mainWindow.webContents.on('console-message', (...args) => {
    const detail =
      typeof args[1] === 'object' && args[1] !== null
        ? args[1]
        : { level: args[1], message: args[2] };
    if (detail.level === 'error' || detail.level === 3) {
      console.log('[渲染进程错误]', detail.message || '');
    }
  });

  // F12 打开/关闭开发者工具
  mainWindow.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  ensureDirs();
  registerIpc();
  Menu.setApplicationMenu(null);
  createWindow();

  // 自动化自检模式：设置 READER_AUTOTEST=1 时启动 5 秒后自动退出
  if (process.env.READER_AUTOTEST === '1') {
    setTimeout(() => app.quit(), 5000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => app.quit());

process.on('uncaughtException', (err) => {
  console.error('[主进程异常]', err);
});
