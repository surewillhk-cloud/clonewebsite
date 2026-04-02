#!/usr/bin/env node
/**
 * 执行 Supabase 数据库迁移
 * 使用: DATABASE_URL="postgresql://..." node scripts/run-migrations.mjs
 * 或: 在 .env.local 中配置 DATABASE_URL 后执行 npm run db:migrate
 *
 * Supabase 连接串可从 Dashboard -> Project Settings -> Database -> Connection string 获取
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '../supabase/migrations');

// 从 .env.local 读取 DATABASE_URL（简单解析）
function loadEnv() {
  try {
    const envPath = join(__dirname, '../.env.local');
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*DATABASE_URL\s*=\s*["']?([^"'\s#]+)/);
      if (match) return match[1].trim();
    }
  } catch {}
  return process.env.DATABASE_URL;
}

async function runMigrations() {
  const dbUrl = loadEnv();
  if (!dbUrl) {
    console.error('缺少 DATABASE_URL。请在 .env.local 中配置，或通过环境变量传入。');
    console.error('示例: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log('已连接数据库');

    // 创建迁移记录表
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const name = file;
      const { rows } = await client.query(
        'SELECT 1 FROM _migrations WHERE name = $1',
        [name]
      );
      if (rows.length > 0) {
        console.log('跳过（已执行）:', name);
        continue;
      }

      const sql = readFileSync(join(migrationsDir, file), 'utf8');
      console.log('执行:', name);
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [name]);
      console.log('  -> 完成');
    }

    console.log('\n迁移全部完成');
  } catch (err) {
    console.error('迁移失败:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
