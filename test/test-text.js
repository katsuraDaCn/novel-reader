'use strict';

// 测试 lib/text.js：解码 + 章节切分
// 先运行 test/gen-samples.js 生成样例，再运行本文件

const fs = require('fs');
const path = require('path');
const { buildBook, splitChapters } = require('../lib/text');

let fail = 0;

const dir = path.join(__dirname, 'samples');
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.txt'))) {
  const buf = fs.readFileSync(path.join(dir, f));
  const b = buildBook(f, buf);
  const titles = b.chapters.map((c) => c.title).join(' | ');
  const okEnc = /^(UTF-8|UTF-16LE|UTF-16BE|GB18030)$/.test(b.encoding);
  const okChapter = b.chapters.some((c) => c.title.includes('第一章'));
  const okText = b.chapters.some((c) => c.paragraphs.some((p) => p.includes('少年走出山村')));
  const ok = okEnc && okChapter && okText;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${f}: 编码=${b.encoding} 章节=${b.chapters.length} 书名=${b.title}\n      标题=[${titles}]`
  );
  if (!ok) fail = 1;
}

// 无章节标记的长文应自动分节
const big = Array.from(
  { length: 3000 },
  (_, i) => `这是第${i + 1}段测试内容，用来验证自动分节功能，包含一些常用的汉字和标点。`
).join('\n');
const chunks = splitChapters(big);
const okChunk = chunks.length > 1 && chunks[0].title.includes('第 1 节');
console.log(`${okChunk ? 'PASS' : 'FAIL'}  无章节长文自动分节: 共 ${chunks.length} 节`);
if (!okChunk) fail = 1;

// 短文无章节 → 保持单章
const small = '只有一段话的短文，不需要分章。';
const one = splitChapters(small);
const okOne = one.length === 1 && one[0].title === '开篇';
console.log(`${okOne ? 'PASS' : 'FAIL'}  短文保持单章: ${one.length} 章, 标题=${one[0] && one[0].title}`);
if (!okOne) fail = 1;

process.exit(fail);
