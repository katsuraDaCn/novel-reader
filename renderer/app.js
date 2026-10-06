'use strict';

/* ================= 基础工具 ================= */

const $ = (sel) => document.querySelector(sel);

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

function fmtCount(n) {
  if (n >= 10000) return (n / 10000).toFixed(1) + ' 万字';
  return n + ' 字';
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

let toastTimer = null;
function toast(msg) {
  let node = $('#toast');
  if (!node) {
    node = el('div');
    node.id = 'toast';
    document.body.appendChild(node);
  }
  node.textContent = msg;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2200);
}

/* ================= 演示模式（仅在浏览器里直接打开 index.html 时生效，用于预览界面） ================= */

const DEMO_SENTENCES = [
  '清晨的雾气还没有散去，山间的小路已经能看清轮廓。',
  '他停下脚步，回头看了一眼来时的方向，远处只有连绵的山影。',
  '风从竹林里穿过，发出细碎的响声，像是有人在低声说话。',
  '桌上的茶已经凉了，信纸上的字迹却依然清晰。',
  '她把伞收起来，雨水顺着伞骨滴落在青石板上。',
  '有些话一旦说出口，就再也收不回来了。',
  '老者摇了摇头，把书合上，放回了木架的最高一层。',
  '夜色渐深，镇上的灯火一盏一盏地熄灭了。',
  '他握紧手中的信，指节因为用力而微微发白。',
  '河水安静地流着，倒映着两岸的灯影。',
  '这么多年过去了，那座桥还是老样子。',
  '她想说什么，最终只是笑了笑，把话咽了回去。',
  '远处的钟声响了起来，一下，又一下。',
  '少年把行李放在地上，抬头打量这座陌生的城市。',
  '窗外的雨下了一整夜，天亮时才慢慢停住。',
  '记忆里的院子比眼前的大得多，如今却显得如此狭窄。',
  '他把最后一块干粮掰成两半，分给了路边的孩子。',
  '山那边的世界，据说和这里完全不同。',
  '她数着日子过了三年，数到后来已经记不清是从哪一天开始的。',
  '驿站的马嘶鸣了两声，把打盹的伙计惊醒了。',
  '真正的答案，往往藏在最不起眼的角落里。',
  '他终于明白，有些路只能一个人走。',
  '雪落在屋檐上，无声无息，却把整个世界都压低了。',
  '故事讲到这里，喝茶的人都还没有散。',
];
const DEMO_TITLES = ['雾起', '来信', '远行', '旧宅', '灯火', '故人', '雪夜', '桥头', '山雨', '归途', '谜底', '别离', '晨钟', '驿站', '茶馆', '长路'];

function makeDemoBook(title = '山间来信（示例书籍）') {
  const chapters = [];
  const chapterCount = 24 + Math.floor(Math.random() * 12);
  let charCount = 0;
  for (let c = 1; c <= chapterCount; c++) {
    const paragraphs = [];
    const pn = 26 + Math.floor(Math.random() * 36);
    for (let p = 0; p < pn; p++) {
      let text = '';
      const k = 1 + Math.floor(Math.random() * 3);
      for (let j = 0; j <= k; j++) text += DEMO_SENTENCES[Math.floor(Math.random() * DEMO_SENTENCES.length)];
      paragraphs.push(text);
      charCount += text.length;
    }
    chapters.push({ title: `第${c}章 ${DEMO_TITLES[(c - 1) % DEMO_TITLES.length]}`, paragraphs });
  }
  return {
    id: 'bk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    title,
    encoding: 'UTF-8',
    charCount,
    chapters,
  };
}

function createMockApi() {
  console.warn('[演示模式] 未检测到桌面端接口，正在使用内置示例数据预览界面。');
  let lib = [];
  const books = {};
  const addBook = (book) => {
    books[book.id] = book;
    const meta = {
      id: book.id,
      title: book.title,
      chapterCount: book.chapters.length,
      charCount: book.charCount,
      encoding: book.encoding,
      importedAt: Date.now(),
      sourcePath: '',
      chapterIdx: 0,
      scrollRatio: 0,
      lastReadAt: 0,
    };
    lib.unshift(meta);
    return meta;
  };
  if (!lib.length) addBook(makeDemoBook());
  return {
    __mock: true,
    pathForFile: (file) => (file && file.name) || '',
    getLibrary: async () => lib.slice(),
    importDialog: async () => ({ canceled: false, added: [addBook(makeDemoBook())], skipped: 0 }),
    importPaths: async () => ({ added: [addBook(makeDemoBook())], skipped: 0 }),
    getBook: async (id) => books[id] || null,
    saveProgress: async (id, progress) => {
      const meta = lib.find((m) => m.id === id);
      if (!meta) return false;
      Object.assign(meta, progress, { lastReadAt: Date.now() });
      return true;
    },
    deleteBook: async (id) => {
      const i = lib.findIndex((m) => m.id === id);
      if (i !== -1) lib.splice(i, 1);
      return true;
    },
  };
}

/* ================= 全局状态 ================= */

const SETTINGS_KEY = 'novel-reader-settings';
const FONT_STACKS = {
  default: '"Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", "Segoe UI", system-ui, sans-serif',
  song: '"SimSun", "NSimSun", "Songti SC", serif',
  hei: '"Microsoft YaHei", "PingFang SC", "SimHei", sans-serif',
  kai: '"KaiTi", "Kaiti SC", "STKaiti", serif',
};
const DEFAULT_SETTINGS = { fontSize: 19, lineHeight: 1.9, pageWidth: 720, fontFamily: 'default', theme: 'sepia' };

const state = {
  library: [],
  book: null, // 当前打开的书（含 chapters）
  chapterIdx: 0,
  settings: { ...DEFAULT_SETTINGS },
};

// 注意：contextBridge 暴露的 window.api 是不可配置的全局属性，
// 不能再用 const api 声明同名变量（会报 Identifier has already been declared）
const backend = window.api || createMockApi();

/* ================= 设置 ================= */

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    if (saved && typeof saved === 'object') Object.assign(state.settings, saved);
  } catch (_) {
    // 忽略损坏的设置
  }
}

function applySettings() {
  const s = state.settings;
  document.body.style.setProperty('--fs', s.fontSize + 'px');
  document.body.style.setProperty('--lh', String(s.lineHeight));
  document.body.style.setProperty('--pw', s.pageWidth + 'px');
  document.body.style.setProperty('--font', FONT_STACKS[s.fontFamily] || FONT_STACKS.default);
  document.body.dataset.theme = s.theme;

  $('#font-value').textContent = s.fontSize;
  $('#line-height').value = String(Math.round(s.lineHeight * 10));
  $('#line-height-value').textContent = s.lineHeight.toFixed(1);
  $('#page-width').value = String(s.pageWidth);
  $('#page-width-value').textContent = String(s.pageWidth);
  document.querySelectorAll('#font-family-group .seg').forEach((b) => {
    b.classList.toggle('active', b.dataset.font === s.fontFamily);
  });
  document.querySelectorAll('#theme-group .theme-dot').forEach((b) => {
    b.classList.toggle('active', b.dataset.theme === s.theme);
  });
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch (_) {
    // 忽略存储失败
  }
}

function changeFont(delta) {
  state.settings.fontSize = Math.max(14, Math.min(30, state.settings.fontSize + delta));
  applySettings();
}

/* ================= 书架 ================= */

async function loadLibrary() {
  state.library = (await backend.getLibrary()) || [];
  renderShelf();
}

function bookPercent(meta) {
  if (!meta.chapterCount) return 0;
  const v = (((meta.chapterIdx || 0) + (meta.scrollRatio || 0)) / meta.chapterCount) * 100;
  return Math.max(0, Math.min(100, v));
}

function renderShelf() {
  const grid = $('#shelf-grid');
  grid.textContent = '';
  const list = state.library
    .slice()
    .sort((a, b) => (b.lastReadAt || b.importedAt) - (a.lastReadAt || a.importedAt));
  $('#shelf-empty').classList.toggle('hidden', list.length > 0);

  for (const m of list) {
    const card = el('div', 'book-card');
    card.dataset.id = m.id;

    const del = el('button', 'book-del', '×');
    del.title = '删除这本书';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      removeBook(m);
    });

    const title = el('div', 'book-title', m.title);
    const meta = el('div', 'book-meta', `${m.chapterCount} 章 · ${fmtCount(m.charCount)} · ${m.encoding}`);
    const read = el(
      'div',
      'book-read',
      m.lastReadAt ? `上次读到 ${Math.min((m.chapterIdx || 0) + 1, m.chapterCount)}/${m.chapterCount} 章` : '尚未阅读'
    );
    const bar = el('div', 'book-progress');
    const fill = el('div', 'book-progress-fill');
    const pct = bookPercent(m);
    fill.style.width = pct.toFixed(1) + '%';
    bar.appendChild(fill);
    const pctText = el('div', 'book-pct', pct > 0 ? (pct >= 99.95 ? '已读完成' : pct.toFixed(1) + '%') : '');

    card.append(del, title, meta, read, bar, pctText);
    card.addEventListener('click', () => openBook(m.id));
    grid.appendChild(card);
  }
}

async function removeBook(meta) {
  if (!confirm(`确定要删除《${meta.title}》吗？\n（只会移除书架记录，不会删除你的原文件）`)) return;
  await backend.deleteBook(meta.id);
  await loadLibrary();
  toast('已删除');
}

async function doImportDialog() {
  const r = await backend.importDialog();
  if (r.canceled) return;
  await afterImport(r);
}

async function afterImport(r) {
  await loadLibrary();
  const n = (r.added || []).length;
  if (n) toast(`已导入 ${n} 本小说`);
  else if (r.skipped) toast('所选书籍已在书架中');
  else toast('导入失败：未能解析所选文件');
}

/* ================= 阅读器 ================= */

function showView(name) {
  $('#view-shelf').classList.toggle('hidden', name !== 'shelf');
  $('#view-reader').classList.toggle('hidden', name !== 'reader');
}

async function openBook(id) {
  const book = await backend.getBook(id);
  if (!book || !book.chapters || !book.chapters.length) {
    toast('书籍数据加载失败');
    return;
  }
  state.book = book;
  const meta = state.library.find((m) => m.id === id) || book;
  const idx = Math.min(meta.chapterIdx || 0, book.chapters.length - 1);
  $('#reader-book-title').textContent = book.title;
  $('#toc-search').value = '';
  showView('reader');
  renderToc('');
  renderChapter(idx, { ratio: meta.scrollRatio || 0 });
  $('#reader-scroll').focus();
  closePanels();
}

async function backToShelf() {
  await saveProgressNow();
  state.book = null;
  showView('shelf');
  await loadLibrary();
}

function renderChapter(idx, opts = {}) {
  const book = state.book;
  if (!book || !book.chapters.length) return;
  idx = Math.max(0, Math.min(idx, book.chapters.length - 1));
  state.chapterIdx = idx;

  const ch = book.chapters[idx];
  $('#ch-title').textContent = ch.title;
  const body = $('#ch-body');
  body.textContent = '';
  const frag = document.createDocumentFragment();
  for (const p of ch.paragraphs) frag.appendChild(el('p', null, p));
  body.appendChild(frag);

  const first = idx === 0;
  const last = idx === book.chapters.length - 1;
  $('#btn-prev').disabled = first;
  $('#btn-next').disabled = last;
  $('#btn-prev-end').disabled = first;
  $('#btn-next-end').disabled = last;

  const slider = $('#progress-slider');
  slider.max = String(book.chapters.length);
  slider.value = String(idx + 1);
  slider.disabled = book.chapters.length < 2;

  updateProgressLabel();
  renderTocCurrent();

  // 重置页面进入动画
  const page = document.querySelector('.reader-page');
  page.style.animation = 'none';
  void page.offsetWidth;
  page.style.animation = '';

  const scroller = $('#reader-scroll');
  requestAnimationFrame(() => {
    if (opts.term && highlightTerm(opts.term)) return;
    const max = scroller.scrollHeight - scroller.clientHeight;
    const ratio = opts.ratio || 0;
    scroller.scrollTop = ratio > 0 ? Math.max(0, Math.min(max, max * ratio)) : 0;
  });
}

function highlightTerm(term) {
  for (const p of $('#ch-body').children) {
    const t = p.textContent;
    const i = t.indexOf(term);
    if (i !== -1) {
      p.textContent = '';
      p.append(
        document.createTextNode(t.slice(0, i)),
        Object.assign(el('mark'), { textContent: term }),
        document.createTextNode(t.slice(i + term.length))
      );
      p.scrollIntoView({ block: 'center' });
      return true;
    }
  }
  return false;
}

function currentScrollRatio() {
  const scroller = $('#reader-scroll');
  const max = scroller.scrollHeight - scroller.clientHeight;
  return max > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / max)) : 0;
}

function updateProgressLabel() {
  const book = state.book;
  if (!book || !book.chapters.length) return;
  const pct = ((state.chapterIdx + currentScrollRatio()) / book.chapters.length) * 100;
  $('#progress-label').textContent = pct.toFixed(1) + '%';
}

let saveTimer = null;
function onReaderScroll() {
  updateProgressLabel();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveProgressNow, 400);
}

function saveProgressNow() {
  const book = state.book;
  if (!book) return Promise.resolve();
  return backend.saveProgress(book.id, {
    chapterIdx: state.chapterIdx,
    scrollRatio: currentScrollRatio(),
  });
}

function gotoChapter(idx, opts = {}) {
  if (!state.book) return;
  if (idx < 0 || idx >= state.book.chapters.length) return;
  renderChapter(idx, opts);
  saveProgressNow();
}

function nextChapter() {
  gotoChapter(state.chapterIdx + 1);
}

function prevChapter() {
  gotoChapter(state.chapterIdx - 1);
}

/* ================= 目录面板 ================= */

function renderToc(filter) {
  const list = $('#toc-list');
  list.textContent = '';
  const book = state.book;
  if (!book) return;
  $('#toc-count').textContent = `${book.chapters.length} 章`;
  const term = (filter || '').trim();

  if (!term) {
    book.chapters.forEach((c, i) => list.appendChild(tocItem(i, c.title)));
    renderTocCurrent();
    return;
  }

  const lower = term.toLowerCase();
  const titleHits = [];
  const contentHits = [];
  book.chapters.forEach((c, i) => {
    if (c.title.toLowerCase().includes(lower)) titleHits.push(i);
    if (contentHits.length < 100) {
      const text = c.paragraphs.join('\n');
      const at = text.toLowerCase().indexOf(lower);
      if (at !== -1) {
        contentHits.push({
          i,
          snippet: text.slice(Math.max(0, at - 18), at + term.length + 30).replace(/\n/g, ' '),
        });
      }
    }
  });

  if (titleHits.length) {
    list.appendChild(el('div', 'toc-group', '章节标题'));
    titleHits.forEach((i) => list.appendChild(tocItem(i, book.chapters[i].title, term)));
  }
  if (contentHits.length) {
    list.appendChild(el('div', 'toc-group', '正文匹配'));
    for (const h of contentHits) {
      const item = tocItem(h.i, book.chapters[h.i].title, term);
      const sn = el('div', 'toc-snippet');
      const at = h.snippet.toLowerCase().indexOf(lower);
      if (at >= 0) {
        sn.append(
          document.createTextNode(h.snippet.slice(0, at)),
          Object.assign(el('mark'), { textContent: h.snippet.slice(at, at + term.length) }),
          document.createTextNode(h.snippet.slice(at + term.length))
        );
      } else {
        sn.textContent = h.snippet;
      }
      item.querySelector('.toc-main').appendChild(sn);
      list.appendChild(item);
    }
  }
  if (!titleHits.length && !contentHits.length) {
    list.appendChild(el('div', 'toc-empty', '没有找到匹配内容'));
  }
}

function tocItem(i, title, term) {
  const b = el('button', 'toc-item');
  b.dataset.idx = String(i);
  const main = el('div', 'toc-main');
  main.appendChild(el('span', 'toc-name', title));
  b.append(el('span', 'toc-no', String(i + 1)), main);
  b.addEventListener('click', () => {
    gotoChapter(i, term ? { term } : {});
    closePanels();
  });
  return b;
}

function renderTocCurrent() {
  const cur = String(state.chapterIdx);
  for (const n of document.querySelectorAll('#toc-list .toc-item')) {
    const active = n.dataset.idx === cur;
    n.classList.toggle('active', active);
    if (active && $('#toc-panel').classList.contains('open')) {
      n.scrollIntoView({ block: 'nearest' });
    }
  }
}

/* ================= 面板开合 ================= */

function openPanel(which) {
  $('#toc-panel').classList.toggle('open', which === 'toc');
  $('#settings-panel').classList.toggle('open', which === 'settings');
  $('#panel-mask').classList.toggle('hidden', !which);
  if (which === 'toc') {
    renderTocCurrent();
  }
}

function closePanels() {
  openPanel(null);
}

function togglePanel(which) {
  const panel = which === 'toc' ? $('#toc-panel') : $('#settings-panel');
  openPanel(panel.classList.contains('open') ? null : which);
}

/* ================= 键盘 / 拖放 ================= */

function onKeydown(e) {
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') {
    if (e.key === 'Escape') document.activeElement.blur();
    return;
  }
  if (e.key === 'Escape') {
    if ($('#panel-mask') && !$('#panel-mask').classList.contains('hidden')) {
      closePanels();
    } else if (state.book) {
      backToShelf();
    }
    return;
  }
  if (!state.book) return;
  if (e.key === 'ArrowLeft') prevChapter();
  if (e.key === 'ArrowRight') nextChapter();
}

function hasFiles(e) {
  return e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
}

function bindDragDrop() {
  const overlay = $('#drop-overlay');
  let depth = 0;
  window.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth++;
    overlay.classList.remove('hidden');
  });
  window.addEventListener('dragover', (e) => {
    if (hasFiles(e)) e.preventDefault();
  });
  window.addEventListener('dragleave', () => {
    if (depth > 0 && --depth === 0) overlay.classList.add('hidden');
  });
  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    depth = 0;
    overlay.classList.add('hidden');
    const files = Array.from((e.dataTransfer && e.dataTransfer.files) || []).filter((f) => /\.txt$/i.test(f.name));
    if (!files.length) {
      toast('只支持导入 TXT 文件');
      return;
    }
    const paths = files.map((f) => backend.pathForFile(f)).filter(Boolean);
    if (!paths.length) {
      toast('无法读取文件路径');
      return;
    }
    const r = await backend.importPaths(paths);
    await afterImport(r);
  });
}

/* ================= 事件绑定与启动 ================= */

function bindEvents() {
  $('#btn-import').addEventListener('click', doImportDialog);
  $('#btn-back').addEventListener('click', backToShelf);
  $('#btn-toc').addEventListener('click', () => togglePanel('toc'));
  $('#btn-settings').addEventListener('click', () => togglePanel('settings'));
  $('#panel-mask').addEventListener('click', closePanels);

  $('#btn-prev').addEventListener('click', prevChapter);
  $('#btn-next').addEventListener('click', nextChapter);
  $('#btn-prev-end').addEventListener('click', prevChapter);
  $('#btn-next-end').addEventListener('click', nextChapter);
  $('#progress-slider').addEventListener('change', (e) => {
    gotoChapter(Number(e.target.value) - 1);
  });

  $('#reader-scroll').addEventListener('scroll', onReaderScroll);

  $('#font-minus').addEventListener('click', () => changeFont(-1));
  $('#font-plus').addEventListener('click', () => changeFont(1));
  $('#line-height').addEventListener('input', (e) => {
    state.settings.lineHeight = Number(e.target.value) / 10;
    applySettings();
  });
  $('#page-width').addEventListener('input', (e) => {
    state.settings.pageWidth = Number(e.target.value);
    applySettings();
  });
  document.querySelectorAll('#font-family-group .seg').forEach((b) =>
    b.addEventListener('click', () => {
      state.settings.fontFamily = b.dataset.font;
      applySettings();
    })
  );
  document.querySelectorAll('#theme-group .theme-dot').forEach((b) =>
    b.addEventListener('click', () => {
      state.settings.theme = b.dataset.theme;
      applySettings();
    })
  );

  $('#toc-search').addEventListener('input', debounce((e) => renderToc(e.target.value), 200));

  window.addEventListener('keydown', onKeydown);
  window.addEventListener('beforeunload', () => {
    saveProgressNow();
  });
  bindDragDrop();
}

async function init() {
  loadSettings();
  applySettings();
  bindEvents();
  await loadLibrary();
}

init();
