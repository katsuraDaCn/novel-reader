'use strict';

// 测试 lib/security.js：哈希/校验/冷却

const { hashPassword, verifyPassword, createAttemptGuard, MAX_ATTEMPTS, COOLDOWN_MS } = require('../lib/security');

let fail = 0;
function check(name, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) fail = 1;
}

// 哈希与校验
const rec = hashPassword('hello-123');
check('随机盐：两次哈希结果不同', hashPassword('hello-123').hash !== hashPassword('hello-123').hash);
check('正确密码通过校验', verifyPassword('hello-123', rec));
check('错误密码被拒绝', !verifyPassword('hello-123 ', rec) && !verifyPassword('Hello-123', rec));
check('损坏的记录被拒绝', !verifyPassword('hello-123', null) && !verifyPassword('x', { salt: 'ab', hash: 'cd' }));
const sameSalt = hashPassword('hello-123', rec.salt);
check('同盐同密码哈希一致', sameSalt.hash === rec.hash);

// 冷却逻辑（注入虚拟时钟）
const g = createAttemptGuard();
const t0 = 1000000;
check('初始不在冷却中', !g.isCoolingDown(t0) && g.attemptsLeft === MAX_ATTEMPTS);
for (let i = 1; i < MAX_ATTEMPTS; i++) g.recordFail(t0 + i);
check('未达上限不触发冷却', !g.isCoolingDown(t0 + MAX_ATTEMPTS) && g.attemptsLeft === 1);
g.recordFail(t0 + MAX_ATTEMPTS);
check('达到上限触发冷却', g.isCoolingDown(t0 + MAX_ATTEMPTS));
check('冷却剩余时间约 30s', Math.abs(g.remainingMs(t0 + MAX_ATTEMPTS) - COOLDOWN_MS) < 50);
check('冷却期内不重置', g.isCoolingDown(t0 + MAX_ATTEMPTS + 1000));
check('冷却结束自动解除', !g.isCoolingDown(t0 + MAX_ATTEMPTS + COOLDOWN_MS));
g.reset();
check('reset 后恢复初始', !g.isCoolingDown(t0) && g.attemptsLeft === MAX_ATTEMPTS);

process.exit(fail);
