/**
 * 截图推流 - MVP 轮询模式
 * 每次请求返回当前页面截图（JPEG base64）
 */

import type { Page } from 'playwright';

const JPEG_QUALITY = 70;

export async function captureScreenshot(page: Page): Promise<string> {
  const buffer = await page.screenshot({
    type: 'jpeg',
    quality: JPEG_QUALITY,
    fullPage: false,
  });
  return Buffer.from(buffer).toString('base64');
}
