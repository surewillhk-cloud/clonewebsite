#!/usr/bin/env node
/**
 * 创建平台管理员账号
 * 使用: node scripts/seed-platform-admin.mjs <email> <password>
 * 或: EMAIL=admin@webecho.ai PASSWORD=xxx node scripts/seed-platform-admin.mjs
 */

import bcrypt from 'bcryptjs';
import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const envPath = join(__dirname, '../.env.local');
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*["']?([^"'\s#]+)/);
      if (m) return m[1].trim();
    }
  } catch {}
  return process.env.DATABASE_URL;
}

async function main() {
  const email = process.env.EMAIL || process.argv[2];
  const password = process.env.PASSWORD || process.argv[3];

  if (!email || !password) {
    console.error('用法: node scripts/seed-platform-admin.mjs <email> <password>');
    console.error('或: EMAIL=... PASSWORD=... node scripts/seed-platform-admin.mjs');
    process.exit(1);
  }

  const dbUrl = loadEnv();
  if (!dbUrl) {
    console.error('缺少 DATABASE_URL，请在 .env.local 中配置');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  const client = new pg.Client({ connectionString: dbUrl });

  try {
    await client.connect();
    await client.query(
      `INSERT INTO platform_admins (email, password_hash, role)
       VALUES ($1, $2, 'super_admin')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2, role = 'super_admin'`,
      [email.trim().toLowerCase(), hash]
    );
    console.log(`管理员已创建/更新: ${email}`);
  } catch (err) {
    console.error('失败:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
