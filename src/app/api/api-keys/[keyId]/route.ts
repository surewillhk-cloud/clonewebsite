/**
 * DELETE /api/api-keys/[keyId] - 撤销 API Key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';
import { revokeApiKey } from '@/lib/api-keys';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { keyId } = await params;
  const ok = await revokeApiKey(userId, keyId);
  if (!ok) {
    return NextResponse.json({ error: 'Failed to revoke or key not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
