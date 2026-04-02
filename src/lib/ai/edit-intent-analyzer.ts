/**
 * Edit Intent Analyzer - 编辑意图分类
 * 基于 Open Lovable 的 edit-intent-analyzer.ts 模式
 * 用于分析错误类型并确定修复策略
 */

import { getAIClient, getDefaultProvider, type AIChatMessage } from './provider-manager';

export enum EditType {
  UPDATE_COMPONENT = 'UPDATE_COMPONENT',
  ADD_FEATURE = 'ADD_FEATURE',
  FIX_ISSUE = 'FIX_ISSUE',
  REFACTOR = 'REFACTOR',
  FULL_REBUILD = 'FULL_REBUILD',
  UPDATE_STYLE = 'UPDATE_STYLE',
  ADD_DEPENDENCY = 'ADD_DEPENDENCY',
  FIX_BUILD_ERROR = 'FIX_BUILD_ERROR',
  FIX_RUNTIME_ERROR = 'FIX_RUNTIME_ERROR',
  FIX_TYPESCRIPT_ERROR = 'FIX_TYPESCRIPT_ERROR',
}

export interface EditIntent {
  type: EditType;
  confidence: number;
  reasoning: string;
  targetFiles?: string[];
  suggestedStrategy?: string;
}

const INTENT_SYSTEM_PROMPT = `You are an expert at analyzing build errors and code issues.
Analyze the error message and determine the best fix strategy.

Classify the issue into one of these categories:
- FIX_BUILD_ERROR: Build process failed (npm install, TypeScript compilation, etc.)
- FIX_TYPESCRIPT_ERROR: TypeScript type errors
- FIX_RUNTIME_ERROR: JavaScript runtime errors
- UPDATE_STYLE: CSS/styling issues
- ADD_DEPENDENCY: Missing npm packages
- UPDATE_COMPONENT: Component-level changes needed
- ADD_FEATURE: New feature implementation

Provide your analysis in JSON format with:
- type: the classification
- confidence: 0-1 how confident you are
- reasoning: brief explanation
- targetFiles: which files likely need changes (if identifiable from error)
- suggestedStrategy: how to fix this`;

const INTENT_ANALYSIS_PROMPT = `
Error Type: {errorType}
Error Message: {errorMessage}
Stack Trace (if available): {stackTrace}

Analyze this error and provide a JSON response with:
{
  "type": "FIX_BUILD_ERROR|FIX_TYPESCRIPT_ERROR|FIX_RUNTIME_ERROR|ADD_DEPENDENCY|UPDATE_STYLE|UPDATE_COMPONENT|...",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of the issue",
  "targetFiles": ["file1.tsx", "file2.css"] (if identifiable),
  "suggestedStrategy": "how to approach fixing this"
}`;

export async function analyzeEditIntent(
  errorMessage: string,
  errorType?: 'build' | 'typescript' | 'runtime' | 'other',
  stackTrace?: string
): Promise<EditIntent> {
  const provider = getDefaultProvider();
  const client = getAIClient(provider);

  const prompt = INTENT_ANALYSIS_PROMPT
    .replace('{errorType}', errorType || 'other')
    .replace('{errorMessage}', errorMessage.slice(0, 2000))
    .replace('{stackTrace}', (stackTrace || '').slice(0, 1000));

  const messages: AIChatMessage[] = [
    { role: 'system', content: INTENT_SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ];

  try {
    const response = await client.chat(messages, {
      model: provider === 'anthropic' ? 'claude-sonnet-4-20250514' : undefined,
      temperature: 0.3,
      maxTokens: 1000,
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        type: parsed.type as EditType,
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || '',
        targetFiles: parsed.targetFiles,
        suggestedStrategy: parsed.suggestedStrategy,
      };
    }
  } catch (err) {
    console.warn('[EditIntentAnalyzer] AI analysis failed:', err);
  }

  return analyzeIntentFallback(errorMessage, errorType);
}

function analyzeIntentFallback(
  errorMessage: string,
  errorType?: string
): EditIntent {
  const msg = errorMessage.toLowerCase();

  if (msg.includes('cannot find module') || msg.includes('modulenotfounderror')) {
    return {
      type: EditType.ADD_DEPENDENCY,
      confidence: 0.9,
      reasoning: 'Missing npm package detected',
      suggestedStrategy: 'Install the missing package or add to package.json',
    };
  }

  if (msg.includes('typescript') || msg.includes('ts-') || msg.includes('type error')) {
    return {
      type: EditType.FIX_TYPESCRIPT_ERROR,
      confidence: 0.9,
      reasoning: 'TypeScript type error detected',
      suggestedStrategy: 'Fix type annotations or add type assertions',
    };
  }

  if (msg.includes('syntaxerror') || msg.includes('parseerror')) {
    return {
      type: EditType.FIX_BUILD_ERROR,
      confidence: 0.9,
      reasoning: 'Syntax error in code',
      suggestedStrategy: 'Fix the syntax error in the indicated location',
    };
  }

  if (msg.includes('css') || msg.includes('style') || msg.includes('classname')) {
    return {
      type: EditType.UPDATE_STYLE,
      confidence: 0.7,
      reasoning: 'CSS or styling issue detected',
      suggestedStrategy: 'Update Tailwind classes or CSS styles',
    };
  }

  if (msg.includes('referenceerror') || msg.includes('undefined')) {
    return {
      type: EditType.FIX_RUNTIME_ERROR,
      confidence: 0.8,
      reasoning: 'Runtime JavaScript error detected',
      suggestedStrategy: 'Fix undefined references or add null checks',
    };
  }

  if (errorType === 'build') {
    return {
      type: EditType.FIX_BUILD_ERROR,
      confidence: 0.7,
      reasoning: 'Build process failed',
      suggestedStrategy: 'Fix build configuration or code errors',
    };
  }

  return {
    type: EditType.FIX_ISSUE,
    confidence: 0.5,
    reasoning: 'General issue detected',
    suggestedStrategy: 'Analyze and fix the error',
  };
}

export function getFixStrategyForIntent(intent: EditIntent): string {
  switch (intent.type) {
    case EditType.ADD_DEPENDENCY:
      return `Install missing dependencies. Strategy: ${intent.suggestedStrategy}`;

    case EditType.FIX_TYPESCRIPT_ERROR:
      return `Fix TypeScript errors. Strategy: ${intent.suggestedStrategy}

Guidelines:
- Add proper type annotations
- Use 'as' type assertions sparingly
- Define interfaces for complex objects
- Avoid 'any' type when possible`;

    case EditType.FIX_BUILD_ERROR:
      return `Fix build errors. Strategy: ${intent.suggestedStrategy}

Guidelines:
- Check for syntax errors
- Verify all imports are correct
- Ensure all required files exist
- Check for missing closing tags`;

    case EditType.FIX_RUNTIME_ERROR:
      return `Fix runtime errors. Strategy: ${intent.suggestedStrategy}

Guidelines:
- Add null/undefined checks
- Use optional chaining (?.)
- Add defensive programming
- Check array bounds before access`;

    case EditType.UPDATE_STYLE:
      return `Fix styling issues. Strategy: ${intent.suggestedStrategy}

Guidelines:
- Use Tailwind CSS classes
- Check className spelling
- Verify CSS specificity
- Ensure responsive classes are correct`;

    default:
      return `Fix the issue. Strategy: ${intent.suggestedStrategy}`;
  }
}
