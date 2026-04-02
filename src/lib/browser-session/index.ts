/**
 * 内嵌浏览器模块入口
 * 登录辅助 + 克隆预览（第二阶段）
 */

export { createSession, getSession, destroySession, touchSession, gcIdleSessions } from './session-manager';
export { extractSessionCookies } from './cookie-extractor';
export { detectLoginStatus } from './login-detector';
export { handleAction } from './action-handler';
export { captureScreenshot } from './screenshot-streamer';
export type { BrowserSession, ExtractedCookies, LoginStatus, ActionPayload, SessionPurpose } from './types';
