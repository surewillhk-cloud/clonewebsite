/**
 * 第三方服务特征库配置（存储于 platform_config，支持在线编辑无需部署）
 * 所有修改写入操作日志
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { logConfigChange } from './config-logs';
import { SIGNATURES } from '@/constants/third-party-signatures';

const CONFIG_KEY = 'signatures.thirdParty';

/** 可 JSON 序列化的特征格式（正则存为字符串，格式 /pattern/flags） */
export interface ServiceSignatureSerialized {
  domains?: string[];
  scriptPatterns?: string[];
  classNames?: string[];
  htmlPatterns?: string[];
}

/** 运行时可用的特征格式（含 RegExp） */
export interface ServiceSignature {
  domains?: string[];
  scriptPatterns?: RegExp[];
  classNames?: string[];
  htmlPatterns?: RegExp[];
}

function parseRegexStr(s: string): RegExp {
  const m = s.match(/^\/(.+)\/([gimsuy]*)$/);
  if (m) {
    try {
      return new RegExp(m[1], m[2] || '');
    } catch {
      return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
  }
  return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

function serializeRegex(r: RegExp): string {
  const flags = r.flags;
  return flags ? `/${r.source}/${flags}` : `/${r.source}/`;
}

/** 将常量中的 SIGNATURES 转为可序列化格式 */
function signaturesToSerialized(
  sigs: Record<string, { domains?: string[]; scriptPatterns?: RegExp[]; classNames?: string[]; htmlPatterns?: RegExp[] }>
): Record<string, ServiceSignatureSerialized> {
  const out: Record<string, ServiceSignatureSerialized> = {};
  for (const [name, s] of Object.entries(sigs)) {
    out[name] = {
      domains: s.domains,
      scriptPatterns: s.scriptPatterns?.map((r) => serializeRegex(r)),
      classNames: s.classNames,
      htmlPatterns: s.htmlPatterns?.map((r) => serializeRegex(r)),
    };
  }
  return out;
}

/** 将可序列化格式转为运行时可用的格式 */
function serializedToRuntime(
  raw: Record<string, ServiceSignatureSerialized>
): Record<string, ServiceSignature> {
  const out: Record<string, ServiceSignature> = {};
  for (const [name, s] of Object.entries(raw)) {
    if (!s || typeof s !== 'object') continue;
    out[name] = {
      domains: Array.isArray(s.domains) ? s.domains : undefined,
      scriptPatterns: Array.isArray(s.scriptPatterns)
        ? s.scriptPatterns.map((x) => (typeof x === 'string' ? parseRegexStr(x) : /.*/))
        : undefined,
      classNames: Array.isArray(s.classNames) ? s.classNames : undefined,
      htmlPatterns: Array.isArray(s.htmlPatterns)
        ? s.htmlPatterns.map((x) => (typeof x === 'string' ? parseRegexStr(x) : /.*/))
        : undefined,
    };
  }
  return out;
}

/**
 * 获取第三方服务特征库（数据库优先，空则用常量默认）
 */
export async function getSignatures(): Promise<Record<string, ServiceSignature>> {
  try {
    const supabase = createAdminClient();
    const { data } = await (supabase as any)
      .from('platform_config')
      .select('value')
      .eq('key', CONFIG_KEY)
      .maybeSingle();

    const raw = data?.value;
    if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
      return serializedToRuntime(raw);
    }
  } catch (e) {
    console.warn('[signatures-config] Load from DB failed, using defaults:', e);
  }
  return serializedToRuntime(signaturesToSerialized(SIGNATURES));
}

/**
 * 获取可编辑的 JSON 格式（用于管理后台）
 */
export async function getSignaturesForEdit(): Promise<Record<string, ServiceSignatureSerialized>> {
  try {
    const supabase = createAdminClient();
    const { data } = await (supabase as any)
      .from('platform_config')
      .select('value')
      .eq('key', CONFIG_KEY)
      .maybeSingle();

    const raw = data?.value;
    if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
      return raw;
    }
  } catch {
    // ignore
  }
  return signaturesToSerialized(SIGNATURES);
}

/**
 * 保存第三方服务特征库
 */
export async function saveSignatures(
  sigs: Record<string, ServiceSignatureSerialized>,
  updatedBy: string
): Promise<void> {
  const supabase = createAdminClient();
  const oldSigs = await getSignaturesForEdit();
  await (supabase as any).from('platform_config').upsert(
    {
      key: CONFIG_KEY,
      value: sigs,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  );
  await logConfigChange({
    action: 'signatures.update',
    configKey: CONFIG_KEY,
    oldValue: oldSigs,
    newValue: sigs,
    updatedBy,
  });
}
