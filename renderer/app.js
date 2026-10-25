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
      hidden: false,
    };
    lib.unshift(meta);
    return meta;
  };
  // 演示模式下的隐私书架状态（仅内存，与主进程“重启即上锁”的行为一致）
  const sec = { record: null, unlocked: false };
  const guard = { fails: 0, until: 0 };
  if (!lib.length) {
    addBook(makeDemoBook('山间来信（示例书籍）'));
    addBook(makeDemoBook('雾中灯塔（示例书籍）'));
    addBook(makeDemoBook('北方无战事（示例书籍）'));
  }
  return {
    __mock: true,
    pathForFile: (file) => (file && file.name) || '',
    getLibrary: async () => lib.filter((m) => !m.hidden),
    getHiddenLibrary: async () => (sec.unlocked ? lib.filter((m) => m.hidden) : []),
    hideBook: async (id, hidden) => {
      const meta = lib.find((m) => m.id === id);
      if (!meta) return false;
      if (meta.hidden && !hidden && !sec.unlocked) return false;
      meta.hidden = !!hidden;
      return true;
    },
    reorderBooks: async (orderedIds) => {
      if (!Array.isArray(orderedIds)) return false;
      orderedIds.forEach((id, i) => {
        const meta = lib.find((m) => m.id === id);
        if (meta) meta.order = i;
      });
      return true;
    },
    importDialog: async () => ({ canceled: false, added: [addBook(makeDemoBook())], skipped: 0 }),
    importPaths: async () => ({ added: [addBook(makeDemoBook())], skipped: 0 }),
    getBook: async (id) => {
      const meta = lib.find((m) => m.id === id);
      if (meta && meta.hidden && !sec.unlocked) return null;
      return books[id] || null;
    },
    saveProgress: async (id, progress) => {
      const meta = lib.find((m) => m.id === id);
      if (!meta) return false;
      Object.assign(meta, progress, { lastReadAt: Date.now() });
      return true;
    },
    deleteBook: async (id) => {
      const i = lib.findIndex((m) => m.id === id);
      if (i === -1) return false;
      if (lib[i].hidden && !sec.unlocked) return false;
      lib.splice(i, 1);
      return true;
    },
    securityStatus: async () => ({
      hasPassword: !!sec.record,
      unlocked: sec.unlocked,
      hint: sec.record ? sec.record.hint || '' : '',
    }),
    // 演示模式仅在内存中比对密码，不落盘
    securitySetup: async ({ password, hint } = {}) => {
      if (sec.record) return { ok: false, error: '已设置过密码' };
      if (!password) return { ok: false, error: '密码不能为空' };
      sec.record = { hint: hint || '', demo: password };
      sec.unlocked = true;
      return { ok: true };
    },
    securityUnlock: async (password) => {
      const now = Date.now();
      if (now < guard.until) return { ok: false, cooldownMs: guard.until - now };
      if (!sec.record) return { ok: false, error: '尚未设置密码' };
      if (password !== sec.record.demo) {
        guard.fails += 1;
        if (guard.fails >= 5) {
          guard.until = now + 30000;
          guard.fails = 0;
        }
        if (now < guard.until) return { ok: false, cooldownMs: guard.until - now };
        return { ok: false, error: '密码不对', attemptsLeft: 5 - guard.fails };
      }
      guard.fails = 0;
      guard.until = 0;
      sec.unlocked = true;
      return { ok: true };
    },
    securityLock: async () => {
      sec.unlocked = false;
      return true;
    },
    securityChange: async ({ oldPassword, newPassword } = {}) => {
      if (!sec.record) return { ok: false, error: '尚未设置密码' };
      if (oldPassword !== sec.record.demo) return { ok: false, error: '旧密码不对' };
      if (!newPassword) return { ok: false, error: '新密码不能为空' };
      sec.record = { hint: sec.record.hint || '', demo: newPassword };
      return { ok: true };
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
  hiddenLibrary: [],
  book: null, // 当前打开的书（含 chapters）
  chapterIdx: 0,
  shelfView: 'normal', // 'normal' 普通书架 | 'vault' 隐藏书架
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

// 自定义排序优先：只要当前列表里每本书都有 order（拖过一次之后就有），就按 order 排
function sortBooks(list) {
  const arr = list.slice();
  if (arr.length > 1 && arr.every((m) => typeof m.order === 'number')) {
    return arr.sort((a, b) => a.order - b.order);
  }
  return arr.sort((a, b) => (b.lastReadAt || b.importedAt) - (a.lastReadAt || a.importedAt));
}

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
  const vault = state.shelfView === 'vault';
  $('#vault-banner').classList.toggle('hidden', !vault);
  $('#btn-import').classList.toggle('hidden', vault);
  $('#shelf-grid').classList.toggle('hidden', vault);
  $('#vault-grid').classList.toggle('hidden', !vault);

  const grid = vault ? $('#vault-grid') : $('#shelf-grid');
  grid.textContent = '';
  const source = vault ? state.hiddenLibrary : state.library;
  const list = sortBooks(source);
  const emptyEl = vault ? $('#vault-empty') : $('#shelf-empty');
  const otherEmptyEl = vault ? $('#shelf-empty') : $('#vault-empty');
  emptyEl.classList.toggle('hidden', list.length > 0);
  otherEmptyEl.classList.add('hidden');
  $('#vault-count').textContent = `🔓 隐藏书架（${list.length} 本）`;

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
    card.draggable = true;
    card.addEventListener('click', () => openBook(m.id));
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openBookContextMenu(e.clientX, e.clientY, m);
    });
    card.addEventListener('dragstart', (e) => onCardDragStart(e, card));
    card.addEventListener('dragover', (e) => onCardDragOver(e, card));
    card.addEventListener('drop', onCardDrop);
    card.addEventListener('dragend', (e) => onCardDragEnd(e, card));
    grid.appendChild(card);
  }
}

async function removeBook(meta) {
  if (!confirm(`确定要删除《${meta.title}》吗？\n（只会移除书架记录，不会删除你的原文件）`)) return;
  await backend.deleteBook(meta.id);
  if (state.shelfView === 'vault') {
    state.hiddenLibrary = await backend.getHiddenLibrary();
    renderShelf();
  } else {
    await loadLibrary();
  }
  toast('已删除');
}

async function hideBook(meta) {
  const ok = await backend.hideBook(meta.id, true);
  if (!ok) {
    toast('操作失败');
    return;
  }
  await loadLibrary();
  toast('已隐藏，点右上角 🔒 查看');
}

async function unhideBook(meta) {
  const ok = await backend.hideBook(meta.id, false);
  if (!ok) {
    toast('操作失败');
    return;
  }
  state.hiddenLibrary = await backend.getHiddenLibrary();
  state.library = await backend.getLibrary();
  renderShelf();
  toast('已取消隐藏');
}

async function loadHidden() {
  state.hiddenLibrary = await backend.getHiddenLibrary();
  renderShelf();
}

async function lockVault() {
  await backend.securityLock();
  state.hiddenLibrary = [];
  state.shelfView = 'normal';
  renderShelf();
  toast('已上锁');
}

/* ================= 拖拽排序 ================= */

let dragCardId = null; // 正在被拖拽的卡片 id（与视觉样式解耦，后台标签页 rAF 节流也能工作）

function onCardDragStart(e, card) {
  // 右上角 × 按钮不作为拖拽起点
  if (e.target && e.target.closest && e.target.closest('.book-del')) {
    e.preventDefault();
    return;
  }
  dragCardId = card.dataset.id;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', card.dataset.id);
  // 拖影生成后再加半透明样式，避免拖影本身变淡
  requestAnimationFrame(() => card.classList.add('dragging'));
}

function onCardDragOver(e, card) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (!dragCardId || card.dataset.id === dragCardId) return;
  const dragging = card.parentNode.querySelector(`.book-card[data-id="${dragCardId}"]`);
  if (!dragging) return;
  const r = card.getBoundingClientRect();
  const before = e.clientX < r.left + r.width / 2;
  card.parentNode.insertBefore(dragging, before ? card : card.nextSibling);
}

function onCardDrop(e) {
  e.preventDefault();
}

async function onCardDragEnd(e, card) {
  dragCardId = null;
  card.classList.remove('dragging');
  const grid = card.parentNode;
  const ids = [...grid.querySelectorAll('.book-card')].map((n) => n.dataset.id);
  const currentIds = sortBooks(state.shelfView === 'vault' ? state.hiddenLibrary : state.library).map((m) => m.id);
  if (ids.join('|') === currentIds.join('|')) return;
  await backend.reorderBooks(ids);
  if (state.shelfView === 'vault') {
    state.hiddenLibrary = await backend.getHiddenLibrary();
  } else {
    state.library = await backend.getLibrary();
  }
  renderShelf();
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
  const meta =
    state.library.find((m) => m.id === id) ||
    (state.hiddenLibrary || []).find((m) => m.id === id) ||
    book;
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
  state.shelfView = 'normal';
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

/* ================= 右键菜单与隐私书架密码弹窗 ================= */

let pwMode = null; // 'setup' | 'unlock' | 'change'
let pwInputs = [];
let cooldownTimer = null;

function openBookContextMenu(x, y, meta) {
  const items =
    state.shelfView === 'vault'
      ? [
          { label: '取消隐藏', action: () => unhideBook(meta) },
          { label: '删除这本书', action: () => removeBook(meta) },
        ]
      : [{ label: '隐藏此书', action: () => hideBook(meta) }];
  openContextMenu(x, y, items);
}

function openContextMenu(x, y, items) {
  const menu = $('#ctx-menu');
  menu.textContent = '';
  for (const it of items) {
    const b = el('button', 'ctx-item', it.label);
    b.addEventListener('click', () => {
      closeContextMenu();
      it.action();
    });
    menu.appendChild(b);
  }
  menu.classList.remove('hidden');
  const rect = menu.getBoundingClientRect();
  menu.style.left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8)) + 'px';
  menu.style.top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8)) + 'px';
}

function closeContextMenu() {
  $('#ctx-menu').classList.add('hidden');
}

function isPwModalOpen() {
  return !$('#pw-modal').classList.contains('hidden');
}

function showPwError(msg) {
  $('#pw-error').textContent = msg || '';
}

function shakeModal() {
  const modal = $('#pw-modal');
  modal.classList.remove('shake');
  void modal.offsetWidth;
  modal.classList.add('shake');
}

function addPwField(placeholder, isText) {
  const row = el('div', 'pw-row');
  const input = el('input');
  input.type = isText ? 'text' : 'password';
  input.placeholder = placeholder;
  input.maxLength = 64;
  input.autocomplete = 'off';
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitPw();
  });
  row.appendChild(input);
  $('#pw-fields').appendChild(row);
  return input;
}

function openPwModal(mode, hint) {
  pwMode = mode;
  pwInputs = [];
  stopCooldown();
  $('#pw-mask').classList.remove('hidden');
  $('#pw-modal').classList.remove('hidden');
  $('#pw-fields').textContent = '';
  showPwError('');
  const hintEl = $('#pw-hint');
  if (mode === 'setup') {
    $('#pw-title').textContent = '设置隐私书架密码';
    hintEl.classList.add('hidden');
    pwInputs = [addPwField('新密码'), addPwField('确认新密码'), addPwField('密码提示（可选）', true)];
  } else if (mode === 'unlock') {
    $('#pw-title').textContent = '解锁隐私书架';
    if (hint) {
      hintEl.textContent = `提示：${hint}`;
      hintEl.classList.remove('hidden');
    } else {
      hintEl.classList.add('hidden');
    }
    pwInputs = [addPwField('密码')];
  } else if (mode === 'change') {
    $('#pw-title').textContent = '修改密码';
    hintEl.classList.add('hidden');
    pwInputs = [addPwField('旧密码'), addPwField('新密码'), addPwField('确认新密码')];
  }
  setTimeout(() => pwInputs[0] && pwInputs[0].focus(), 30);
}

function closePwModal() {
  stopCooldown();
  $('#pw-mask').classList.add('hidden');
  $('#pw-modal').classList.add('hidden');
  pwMode = null;
  pwInputs = [];
}

function startCooldown(ms) {
  stopCooldown();
  $('#pw-ok').disabled = true;
  pwInputs.forEach((i) => (i.disabled = true));
  const tick = () => showPwError(`失败次数过多，请 ${Math.max(1, Math.ceil(ms / 1000))} 秒后再试`);
  tick();
  cooldownTimer = setInterval(() => {
    ms -= 500;
    if (ms <= 0) {
      stopCooldown();
      showPwError('');
      return;
    }
    tick();
  }, 500);
}

function stopCooldown() {
  if (cooldownTimer) {
    clearInterval(cooldownTimer);
    cooldownTimer = null;
  }
  const okBtn = $('#pw-ok');
  if (okBtn) okBtn.disabled = false;
  pwInputs.forEach((i) => (i.disabled = false));
}

async function submitPw() {
  if (!isPwModalOpen()) return;
  const vals = pwInputs.map((i) => i.value);

  if (pwMode === 'setup') {
    if (!vals[0]) {
      showPwError('密码不能为空');
      shakeModal();
      return;
    }
    if (vals[0] !== vals[1]) {
      showPwError('两次输入的密码不一致');
      shakeModal();
      return;
    }
    const r = await backend.securitySetup({ password: vals[0], hint: vals[2] || '' });
    if (!r.ok) {
      showPwError(r.error || '设置失败');
      shakeModal();
      return;
    }
    closePwModal();
    toast('密码已设置');
    state.shelfView = 'vault';
    await loadHidden();
  } else if (pwMode === 'unlock') {
    if (!vals[0]) {
      showPwError('请输入密码');
      return;
    }
    const r = await backend.securityUnlock(vals[0]);
    if (r.ok) {
      closePwModal();
      toast('已解锁');
      state.shelfView = 'vault';
      await loadHidden();
    } else if (r.cooldownMs) {
      startCooldown(r.cooldownMs);
    } else {
      showPwError((r.error || '解锁失败') + (typeof r.attemptsLeft === 'number' ? `，还可尝试 ${r.attemptsLeft} 次` : ''));
      shakeModal();
    }
  } else if (pwMode === 'change') {
    if (!vals[0] || !vals[1]) {
      showPwError('请填写完整');
      return;
    }
    if (vals[1] !== vals[2]) {
      showPwError('两次输入的新密码不一致');
      shakeModal();
      return;
    }
    const r = await backend.securityChange({ oldPassword: vals[0], newPassword: vals[1] });
    if (!r.ok) {
      showPwError(r.error || '修改失败');
      shakeModal();
      return;
    }
    closePwModal();
    toast('密码已修改');
  }
}

async function onVaultButton() {
  const st = await backend.securityStatus();
  if (st.unlocked) {
    state.shelfView = 'vault';
    await loadHidden();
    return;
  }
  openPwModal(st.hasPassword ? 'unlock' : 'setup', st.hint);
}

/* ================= 键盘 / 拖放 ================= */

function onKeydown(e) {
  const tag = document.activeElement && document.activeElement.tagName;
  if (e.key === 'Escape') {
    if (isPwModalOpen()) {
      closePwModal();
      return;
    }
    if (!$('#ctx-menu').classList.contains('hidden')) {
      closeContextMenu();
      return;
    }
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      document.activeElement.blur();
      return;
    }
    if ($('#panel-mask') && !$('#panel-mask').classList.contains('hidden')) {
      closePanels();
    } else if (state.book) {
      backToShelf();
    }
    return;
  }
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
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

  $('#btn-vault').addEventListener('click', onVaultButton);
  $('#btn-lock').addEventListener('click', lockVault);
  $('#btn-change-password').addEventListener('click', () => openPwModal('change'));
  $('#pw-cancel').addEventListener('click', closePwModal);
  $('#pw-ok').addEventListener('click', submitPw);
  $('#pw-mask').addEventListener('click', closePwModal);
  window.addEventListener('click', (e) => {
    if (!(e.target instanceof Element) || !e.target.closest('#ctx-menu')) closeContextMenu();
  });
  window.addEventListener('contextmenu', (e) => {
    if (!(e.target instanceof Element) || !e.target.closest('.book-card')) closeContextMenu();
  });

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
