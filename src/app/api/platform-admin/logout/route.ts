/**
 * POST /api/platform-admin/logout
 */

import { NextResponse } from 'next/server';
import { clearAdminSession } from '@/lib/platform-admin/auth';

export async function POST() {
  await clearAdminSession();
  const url = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:4000';
  return NextResponse.redirect(`${url}/platform-admin/login`);
}
