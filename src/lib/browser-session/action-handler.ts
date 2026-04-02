/**
 * 接收前端操作事件，转为 Playwright 指令
 */

import type { Page } from 'playwright';
import type { ActionPayload } from './types';

export async function handleAction(page: Page, payload: ActionPayload): Promise<void> {
  const { type } = payload;

  switch (type) {
    case 'click':
      if (typeof payload.x === 'number' && typeof payload.y === 'number') {
        await page.mouse.click(payload.x, payload.y);
      }
      break;

    case 'keypress':
      if (payload.key) {
        await page.keyboard.press(payload.key);
      }
      break;

    case 'scroll':
      if (typeof payload.deltaY === 'number') {
        await page.mouse.wheel(0, payload.deltaY);
      }
      break;

    case 'navigate':
      if (payload.url) {
        await page.goto(payload.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      }
      break;

    default:
      break;
  }
}
