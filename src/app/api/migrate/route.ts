import { NextResponse } from 'next/server';
import { query, isDbConfigured } from '@/lib/db';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Migration disabled in production' }, { status: 403 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const results: string[] = [];

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
    results.push('users table created');

    // Create index on email
    await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    results.push('users email index created');

    // Create clone_tasks table
    await query(`
      CREATE TABLE IF NOT EXISTS clone_tasks (
        id uuid PRIMARY KEY,
        user_id text NOT NULL DEFAULT 'anon',
        clone_type text NOT NULL DEFAULT 'web',
        target_url text,
        complexity text NOT NULL,
        credits_used integer NOT NULL DEFAULT 1,
        status text NOT NULL DEFAULT 'queued',
        progress integer NOT NULL DEFAULT 0,
        current_step text DEFAULT '',
        delivery_mode text NOT NULL DEFAULT 'download',
        target_language text NOT NULL DEFAULT 'original',
        quality_score integer,
        retry_count integer NOT NULL DEFAULT 0,
        r2_key text,
        local_zip_path text,
        error_message text,
        created_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz
      )
    `);
    results.push('clone_tasks table created');

    // Create clone_tasks indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_clone_tasks_user_id ON clone_tasks(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_clone_tasks_status ON clone_tasks(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_clone_tasks_created_at ON clone_tasks(created_at DESC)`);
    results.push('clone_tasks indexes created');

    // Create hosted_sites table
    await query(`
      CREATE TABLE IF NOT EXISTS hosted_sites (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text NOT NULL,
        clone_task_id uuid NOT NULL REFERENCES clone_tasks(id),
        github_repo_url text,
        github_repo_name text,
        railway_project_id text,
        railway_service_id text,
        railway_deployment_url text,
        custom_domain text,
        domain_verified boolean DEFAULT false,
        hosting_plan text NOT NULL DEFAULT 'static_starter',
        stripe_subscription_id text,
        status text NOT NULL DEFAULT 'deploying',
        railway_budget_used integer DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        suspended_at timestamptz
      )
    `);
    results.push('hosted_sites table created');

    // Create hosted_sites indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_hosted_sites_user_id ON hosted_sites(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_hosted_sites_clone_task_id ON hosted_sites(clone_task_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_hosted_sites_status ON hosted_sites(status)`);
    results.push('hosted_sites indexes created');

    return NextResponse.json({ 
      success: true, 
      message: 'All tables created successfully',
      details: results
    });
  } catch (err) {
    console.error('[migration]', err);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: 'Internal server error',
      partialResults: results
    }, { status: 500 });
  }
}
