'use strict';

/*
 * 文本解码与章节切分。
 * 不依赖 Electron，可以直接用 Node 单独测试（见 test/test-text.js）。
 */

const CHAPTER_RE = new RegExp(
  '^[\\s\u3000]*(?:' +
    // 第X章 / 第X节 / 第X卷 / 第X回 / 第X部 / 第X集 / 第X篇 / 第X话
    '\u7b2c\\s*[0-9\uFF10-\uFF19\u96f6\u3007\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5343\u4e07\u4ebf\u58f9\u8d30\u53c1\u8086\u4f0d\u9646\u67d2\u634c\u7396\u62fe\u4f70\u4edf\u4e24]+\\s*[\u7ae0\u8282\u5377\u56de\u90e8\u96c6\u7bc7\u8bdd]' +
    // 卷X（卷一）
    '|[\u5377][0-9\u96f6\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5343\u4e07]+' +
    // Chapter 12
    '|[Cc]hapter\\s+\\d+' +
    // 常见特殊章节
    '|\u5e8f\u7ae0|\u5e8f\u8a00|\u6954\u5b50|\u5f15\u5b50|\u5c3e\u58f0|\u7ec8\u7ae0|\u540e\u8bb0|\u756a\u5916[\u7bc7\u7ae0]?' +
    ')[^\n]{0,60}$'
);

/**
 * 识别文件 Buffer 的编码并解码为字符串。
 * 依次尝试：UTF-8 BOM → UTF-16 LE/BE BOM → 严格 UTF-8 → GB18030（GBK/GB2312 的超集）。
 */
function decodeText(buf) {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return { text: buf.slice(3).toString('utf8'), encoding: 'UTF-8' };
  }
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return { text: buf.slice(2).toString('utf16le'), encoding: 'UTF-16LE' };
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.alloc((buf.length - 2) & ~1);
    for (let i = 2; i + 1 < buf.length; i += 2) {
      swapped[i - 2] = buf[i + 1];
      swapped[i - 1] = buf[i];
    }
    return { text: swapped.toString('utf16le'), encoding: 'UTF-16BE' };
  }
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(buf), encoding: 'UTF-8' };
  } catch (_) {
    // 不是合法 UTF-8，按中文最常见的 GBK 处理
  }
  try {
    return { text: new TextDecoder('gb18030').decode(buf), encoding: 'GB18030' };
  } catch (_) {
    return { text: buf.toString('latin1'), encoding: 'Latin-1' };
  }
}

/**
 * 把整本书切分成章节。
 * 没有章节标记的长文会按段落自动分成约 1.2 万字的“节”，方便导航和加载。
 */
function splitChapters(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const chapters = [];
  let title = null;
  let paras = [];

  const flush = () => {
    if (paras.length === 0) return;
    chapters.push({ title: title || '开篇', paragraphs: paras });
    paras = [];
  };

  for (const raw of lines) {
    const line = raw.replace(/^[\s\u3000]+/, '').replace(/[\s\u3000]+$/, '');
    if (!line) continue;
    if (line.length <= 80 && CHAPTER_RE.test(line)) {
      flush();
      title = line;
    } else {
      paras.push(line);
    }
  }
  flush();

  if (chapters.length === 0) return [];
  if (chapters.length === 1 && chapters[0].paragraphs.length > 60) {
    return chunkChapters(chapters[0].paragraphs);
  }
  return chapters;
}

function chunkChapters(paras, target = 12000) {
  const chapters = [];
  let buf = [];
  let len = 0;
  let idx = 1;
  const flushBuf = () => {
    if (!buf.length) return;
    chapters.push({ title: `第 ${idx} 节`, paragraphs: buf });
    buf = [];
    len = 0;
    idx += 1;
  };
  for (const p of paras) {
    buf.push(p);
    len += p.length;
    if (len >= target) flushBuf();
  }
  flushBuf();
  return chapters;
}

/**
 * 由文件名和文件内容构建书籍对象：{ title, encoding, charCount, chapters }
 */
function buildBook(fileName, buf) {
  const { text, encoding } = decodeText(buf);
  const chapters = splitChapters(text);
  const charCount = chapters.reduce((n, c) => n + c.paragraphs.join('').length, 0);
  return { title: fileName.replace(/\.[^.]+$/, ''), encoding, charCount, chapters };
}

module.exports = { decodeText, splitChapters, chunkChapters, buildBook, CHAPTER_RE };
