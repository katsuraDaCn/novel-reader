'use strict';

// 生成多种编码的测试样例小说（放在 test/samples/ 下）

const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const book = [
  '书名：测试之书',
  '作者：测试员',
  '',
  '第一章 初入江湖',
  '少年走出山村，天色微亮。',
  '他背上行囊，一路向北，心里既紧张又期待。',
  '',
  '第二章 风起云涌',
  '风声乍起，落叶纷飞。',
  '江湖恩怨，从此开始，谁也躲不开。',
  '',
  '第三章 尘埃落定',
  '故事仍在继续，人生亦是如此。',
  '多年以后，他终于回到了出发的地方。',
  '全书完。',
].join('\r\n');

const dir = path.join(__dirname, 'samples');
fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(path.join(dir, 'sample-utf8.txt'), Buffer.from(book, 'utf8'));
fs.writeFileSync(path.join(dir, 'sample-utf8bom.txt'), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(book, 'utf8')]));
fs.writeFileSync(path.join(dir, 'sample-utf16le.txt'), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(book, 'utf16le')]));

const le = Buffer.from(book, 'utf16le');
const be = Buffer.alloc(le.length);
for (let i = 0; i < le.length; i += 2) {
  be[i] = le[i + 1];
  be[i + 1] = le[i];
}
fs.writeFileSync(path.join(dir, 'sample-utf16be.txt'), Buffer.concat([Buffer.from([0xfe, 0xff]), be]));

fs.writeFileSync(path.join(dir, 'sample-gbk.txt'), iconv.encode(book, 'gbk'));

console.log('样例已生成到', dir);
