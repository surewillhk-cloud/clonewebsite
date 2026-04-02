/**
 * POST /api/app/upload-apk
 * 上传 APK 到 R2，返回 r2Key 供 clone/create 使用
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { uploadApkToR2, isR2Configured } from '@/lib/storage/r2';

const MAX_APK_SIZE_MB = 100;

export async function POST(req: NextRequest) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: 'R2 storage not configured. APK upload unavailable.' },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('apk') as File | null;
    if (!file) {
      return NextResponse.json(
        { error: 'Missing apk file. Use form field "apk"' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.apk')) {
      return NextResponse.json(
        { error: 'File must be an APK (.apk)' },
        { status: 400 }
      );
    }

    const sizeBytes = file.size;
    if (sizeBytes > MAX_APK_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `APK size exceeds ${MAX_APK_SIZE_MB}MB limit` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadId = uuidv4();
    const r2Key = await uploadApkToR2(buffer, uploadId);

    return NextResponse.json({
      r2Key,
      uploadId,
      sizeBytes,
    });
  } catch (err) {
    console.error('[upload-apk]', err);
    return NextResponse.json(
      { error: 'APK upload failed' },
      { status: 500 }
    );
  }
}
