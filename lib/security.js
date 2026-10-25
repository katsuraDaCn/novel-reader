'use strict';

/*
 * 隐私书架的密码哈希与错误冷却。
 * 纯 Node 实现，不依赖 Electron，可独立测试（见 test/test-security.js）。
 */

const crypto = require('crypto');

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEYLEN = 32;
const SALT_LEN = 16;

// 连续输错 MAX_ATTEMPTS 次后冷却 COOLDOWN_MS
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 30 * 1000;

/** 生成加盐 scrypt 哈希。不传 saltHex 则随机生成。 */
function hashPassword(password, saltHex) {
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(SALT_LEN);
  const hash = crypto.scryptSync(String(password), salt, KEYLEN, SCRYPT_PARAMS).toString('hex');
  return { salt: salt.toString('hex'), hash };
}

/** 用哈希记录校验密码，恒定时间比较。 */
function verifyPassword(password, record) {
  if (!record || !record.salt || !record.hash) return false;
  const { hash } = hashPassword(password, record.salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(record.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** 连续失败冷却器（内存态，由主进程持有）。now 参数便于测试注入。 */
function createAttemptGuard() {
  let fails = 0;
  let cooldownUntil = 0;
  return {
    isCoolingDown(now = Date.now()) {
      return now < cooldownUntil;
    },
    remainingMs(now = Date.now()) {
      return Math.max(0, cooldownUntil - now);
    },
    recordFail(now = Date.now()) {
      fails += 1;
      if (fails >= MAX_ATTEMPTS) {
        cooldownUntil = now + COOLDOWN_MS;
        fails = 0;
      }
    },
    reset() {
      fails = 0;
      cooldownUntil = 0;
    },
    get attemptsLeft() {
      return MAX_ATTEMPTS - fails;
    },
  };
}

module.exports = { hashPassword, verifyPassword, createAttemptGuard, MAX_ATTEMPTS, COOLDOWN_MS };
