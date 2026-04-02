/**
 * Decodo 住宅代理 - 层2 Playwright 可选代理
 * 配置 DECODO_USERNAME + DECODO_PASSWORD 后，Playwright 层2 自动使用住宅代理
 * 网关: gate.decodo.com:7000
 */

export interface DecodoProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

/**
 * 获取 Decodo 住宅代理配置（供 Playwright 使用）
 * 当 DECODO_USERNAME 与 DECODO_PASSWORD 均已配置时返回代理配置，否则返回 null
 */
export function getDecodoProxy(): DecodoProxyConfig | null {
  const username = process.env.DECODO_USERNAME;
  const password = process.env.DECODO_PASSWORD;

  if (!username || !password) {
    return null;
  }

  return {
    server: 'http://gate.decodo.com:7000',
    username,
    password,
  };
}

/**
 * 检查 Decodo 代理是否已配置
 */
export function isDecodoConfigured(): boolean {
  return getDecodoProxy() !== null;
}
