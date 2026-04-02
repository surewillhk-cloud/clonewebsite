/**
 * POST /api/browser/auth-cache
 * 临时存储 Cookie，返回 token（用于 Stripe 支付流程）
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { set } from '@/lib/auth-cache';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  cookieString: z.string().min(1).max(16000),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const token = uuidv4();
    set(token, parsed.data.cookieString);

    return NextResponse.json({ token });
  } catch (err) {
    console.error('[api/browser/auth-cache]', err);
    return NextResponse.json(
      { error: 'Failed to cache auth' },
      { status: 500 }
    );
  }
}
