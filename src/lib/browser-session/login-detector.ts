/**
 * 登录状态检测 - 自动判断当前页面是否已完成登录
 */

import type { Page } from 'playwright';
import type { LoginStatus } from './types';

const LOGIN_KEYWORDS = ['login', 'signin', 'sign-in', 'auth', 'sso', 'oauth'];
const USER_INDICATORS = [
  '[data-testid="user-menu"]',
  '[data-testid="user-avatar"]',
  '.user-avatar',
  '.user-menu',
  '[aria-label*="user" i]',
  '[aria-label*="profile" i]',
  '.profile-dropdown',
  'nav a[href*="/dashboard"]',
  'nav a[href*="/account"]',
];

export async function detectLoginStatus(
  page: Page,
  _originalLoginUrl: string
): Promise<LoginStatus> {
  try {
    const currentUrl = page.url();
    const urlLower = currentUrl.toLowerCase();

    // 1. URL 仍包含登录关键词 →  likely still on login page
    const stillOnLoginPage = LOGIN_KEYWORDS.some((kw) => urlLower.includes(kw));
    if (stillOnLoginPage) {
      return { isLoggedIn: false, confidence: 'high' };
    }

    // 2. 检测 Log out / Sign out 链接或按钮
    const signOutLocator = page.getByRole('link', { name: /log out|sign out|登出|退出/i });
    if ((await signOutLocator.count()) > 0) {
      return { isLoggedIn: true, confidence: 'high', detectedUserElement: 'signout-link' };
    }
    const signOutBtn = page.getByRole('button', { name: /log out|sign out|登出|退出/i });
    if ((await signOutBtn.count()) > 0) {
      return { isLoggedIn: true, confidence: 'high', detectedUserElement: 'signout-button' };
    }

    // 3. 检测用户特征元素
    for (const selector of USER_INDICATORS) {
      try {
        const el = await page.$(selector);
        if (el) {
          await el.dispose();
          return {
            isLoggedIn: true,
            confidence: 'high',
            detectedUserElement: selector,
          };
        }
      } catch {
        // selector not found, continue
      }
    }

    // 4. 检测登录表单
    const loginForm = await page.$('form[action*="login"], form[action*="signin"], input[type="password"]');
    if (loginForm) {
      await loginForm.dispose();
      return { isLoggedIn: false, confidence: 'medium' };
    }

    // 5. 无法判断
    return { isLoggedIn: false, confidence: 'uncertain' };
  } catch {
    return { isLoggedIn: false, confidence: 'uncertain' };
  }
}
