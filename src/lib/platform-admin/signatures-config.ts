/**
 * 第三方服务特征库配置
 */

import { query, isDbConfigured } from '@/lib/db';
import { logConfigChange } from './config-logs';
import { SIGNATURES } from '@/constants/third-party-signatures';

const CONFIG_KEY = 'signatures.thirdParty';

export interface ServiceSignatureSerialized {
  domains?: string[];
  scriptPatterns?: string[];
  classNames?: string[];
  htmlPatterns?: string[];
}

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

export async function getSignatures(): Promise<Record<string, ServiceSignature>> {
  if (!isDbConfigured()) {
    return serializedToRuntime(signaturesToSerialized(SIGNATURES));
  }

  try {
    const result = await query(
      'SELECT value FROM platform_config WHERE key = $1',
      [CONFIG_KEY]
    );

    if (result.rows.length > 0) {
      const raw = result.rows[0].value;
      if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
        return serializedToRuntime(raw as Record<string, ServiceSignatureSerialized>);
      }
    }
  } catch (e) {
    console.warn('[signatures-config] Load from DB failed, using defaults:', e);
  }
  return serializedToRuntime(signaturesToSerialized(SIGNATURES));
}

export async function getSignaturesForEdit(): Promise<Record<string, ServiceSignatureSerialized>> {
  if (!isDbConfigured()) {
    return signaturesToSerialized(SIGNATURES);
  }

  try {
    const result = await query(
      'SELECT value FROM platform_config WHERE key = $1',
      [CONFIG_KEY]
    );

    if (result.rows.length > 0) {
      const raw = result.rows[0].value;
      if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
        return raw as Record<string, ServiceSignatureSerialized>;
      }
    }
  } catch {
    // ignore
  }
  return signaturesToSerialized(SIGNATURES);
}

export async function saveSignatures(
  sigs: Record<string, ServiceSignatureSerialized>,
  updatedBy: string
): Promise<void> {
  if (!isDbConfigured()) return;

  const oldSigs = await getSignaturesForEdit();
  await query(
    `INSERT INTO platform_config (key, value, updated_by, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
    [CONFIG_KEY, JSON.stringify(sigs), updatedBy]
  );
  await logConfigChange({
    action: 'signatures.update',
    configKey: CONFIG_KEY,
    oldValue: oldSigs,
    newValue: sigs,
    updatedBy,
  });
}
