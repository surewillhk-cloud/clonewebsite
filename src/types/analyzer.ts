/**
 * AI 分析模块类型定义
 */

export interface PageBlock {
  type: string;
  title: string;
  description: string;
}

export interface ColorTheme {
  primary?: string;
  background?: string;
  text?: string;
}

export interface PageStructureResult {
  blocks: PageBlock[];
  colorTheme: ColorTheme;
  fontFamily: string;
  detectedServices: string[];
  complexity: 'static_single' | 'static_multi' | 'dynamic_basic' | 'dynamic_complex';
}
