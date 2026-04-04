'use client';

import { useState, useEffect } from 'react';

interface CodeViewerProps {
  filePath: string | null;
  content: string;
}

function getLanguage(filePath: string): string {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) return 'jsx';
  if (filePath.endsWith('.ts') || filePath.endsWith('.js')) return 'javascript';
  if (filePath.endsWith('.css')) return 'css';
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.html')) return 'html';
  if (filePath.endsWith('.md')) return 'markdown';
  return 'text';
}

function highlightLine(line: string, lang: string): string {
  if (lang === 'json') return line;

  let result = line;

  // Comments
  result = result.replace(/(\/\/.*)/g, '<span class="text-[var(--muted-dark)]">$1</span>');
  result = result.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-[var(--muted-dark)]">$1</span>');

  // Strings
  result = result.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="text-[var(--green)]">$1</span>');
  result = result.replace(/('(?:[^'\\]|\\.)*')/g, '<span class="text-[var(--green)]">$1</span>');
  result = result.replace(/(`(?:[^`\\]|\\.)*`)/g, '<span class="text-[var(--green)]">$1</span>');

  // Keywords
  const keywords = ['import', 'from', 'export', 'default', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'extends', 'new', 'this', 'async', 'await', 'try', 'catch', 'throw', 'typeof', 'instanceof', 'true', 'false', 'null', 'undefined'];
  for (const kw of keywords) {
    const re = new RegExp(`\\b(${kw})\\b`, 'g');
    result = result.replace(re, '<span class="text-[var(--purple)]">$1</span>');
  }

  // JSX tags
  result = result.replace(/(&lt;\/?)(\w+)/g, '$1<span class="text-[var(--accent)]">$2</span>');

  return result;
}

export function CodeViewer({ filePath, content }: CodeViewerProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [lang, setLang] = useState('text');

  useEffect(() => {
    if (!content) { setLines([]); return; }
    setLines(content.split('\n'));
    if (filePath) setLang(getLanguage(filePath));
  }, [content, filePath]);

  if (!filePath || !content) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--muted)]">
        <div className="text-center">
          <div className="text-3xl mb-3">💻</div>
          <div className="text-[13px]">Select a file to view its code</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-[var(--bg)] font-mono text-[13px] leading-[1.7]">
      <div className="min-h-full">
        {lines.map((line, i) => (
          <div
            key={i}
            className="flex hover:bg-[var(--surface-raised)] transition-colors group"
          >
            <div className="flex-shrink-0 w-12 text-right pr-4 text-[var(--muted-dark)] select-none text-[11px] leading-[1.7] group-hover:text-[var(--muted)]">
              {i + 1}
            </div>
            <div
              className="flex-1 pr-4 text-[var(--text-secondary)] whitespace-pre overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: highlightLine(line, lang) }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
