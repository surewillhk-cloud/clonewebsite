/**
 * Cloudflare R2 存储 - zip 包上传与预签名下载
 * 使用 S3 兼容 API
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs/promises';

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY;
const R2_SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_KEY;
const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME;

export function isR2Configured(): boolean {
  return !!(
    R2_ACCOUNT_ID &&
    R2_ACCESS_KEY &&
    R2_SECRET_KEY &&
    R2_BUCKET
  );
}

function getR2Client(): S3Client {
  if (!isR2Configured()) {
    throw new Error('R2 not configured. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY, CLOUDFLARE_R2_SECRET_KEY, CLOUDFLARE_R2_BUCKET_NAME');
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY!,
      secretAccessKey: R2_SECRET_KEY!,
    },
  });
}

/** 上传 zip 到 R2，返回 object key */
export async function uploadZipToR2(
  localZipPath: string,
  taskId: string
): Promise<string> {
  const client = getR2Client();
  const key = `clones/${taskId}/webecho-clone.zip`;

  const buffer = await fs.readFile(localZipPath);
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: 'application/zip',
    })
  );

  return key;
}

/** 上传任意文件 Buffer 到 R2，返回 object key */
export async function uploadBufferToR2(
  buffer: Buffer,
  key: string,
  contentType?: string
): Promise<string> {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: contentType ?? 'application/octet-stream',
    })
  );
  return key;
}

/** 上传 APK 到 R2，返回 object key（用于 APP 克隆 APK 模式） */
export async function uploadApkToR2(
  buffer: Buffer,
  uploadId: string
): Promise<string> {
  const key = `uploads/apk/${uploadId}.apk`;
  return uploadBufferToR2(buffer, key, 'application/vnd.android.package-archive');
}

/** 从 R2 下载 APK 为 Buffer */
export async function downloadApkFromR2(r2Key: string): Promise<Buffer> {
  const client = getR2Client();
  const res = await client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET!,
      Key: r2Key,
    })
  );
  const body = res.Body;
  if (!body) throw new Error('R2 APK body empty');
  const chunks: Uint8Array[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** 从 R2 下载 zip 文件为 Buffer（用于托管部署） */
export async function downloadZipFromR2(r2Key: string): Promise<Buffer> {
  const client = getR2Client();
  const res = await client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET!,
      Key: r2Key,
    })
  );
  const body = res.Body;
  if (!body) throw new Error('R2 object body empty');
  const chunks: Uint8Array[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** 生成下载用的预签名 URL，有效期 1 小时 */
export async function getPresignedDownloadUrl(r2Key: string): Promise<string> {
  const client = getR2Client();
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: R2_BUCKET!,
      Key: r2Key,
    }),
    { expiresIn: 3600 }
  );
  return url;
}
