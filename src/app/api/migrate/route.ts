import { NextResponse } from 'next/server';
import { query, isDbConfigured } from '@/lib/db';

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        password_hash VARCHAR(255),
        credits INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create index on email
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    return NextResponse.json({ 
      success: true, 
      message: 'Users table created successfully' 
    });
  } catch (err) {
    console.error('[migration]', err);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
