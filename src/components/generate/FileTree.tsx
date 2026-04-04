'use client';

import { useState } from 'react';

interface FileNode {
  name: string;
  path: string;
  content: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

interface FileTreeProps {
  files: FileNode[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}

function getFileIcon(name: string): string {
  if (name.endsWith('.tsx') || name.endsWith('.jsx')) return '⚛';
  if (name.endsWith('.ts') || name.endsWith('.js')) return '📜';
  if (name.endsWith('.css')) return '🎨';
  if (name.endsWith('.json')) return '📋';
  if (name.endsWith('.html')) return '🌐';
  if (name.endsWith('.md')) return '📝';
  return '📄';
}

function TreeNode({
  node,
  depth,
  selectedFile,
  onSelectFile,
}: {
  node: FileNode;
  depth: number;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 w-full px-2 py-1 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <span className="text-[10px] transition-transform duration-200">
            {expanded ? '▾' : '▸'}
          </span>
          <span>📁</span>
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && node.children?.map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
          />
        ))}
      </div>
    );
  }

  const isSelected = selectedFile === node.path;

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className={`flex items-center gap-1.5 w-full px-2 py-1 text-[12px] transition-colors ${
        isSelected
          ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <span className="text-[10px]">{getFileIcon(node.name)}</span>
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileTree({ files, selectedFile, onSelectFile }: FileTreeProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-[var(--border-faint)]">
          <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--muted-dark)]">
            Explorer
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <div className="text-2xl mb-2">📂</div>
            <div className="text-[12px] text-[var(--muted)]">
              Start a conversation to generate files
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[var(--border-faint)]">
        <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--muted-dark)]">
          Explorer
        </div>
        <div className="text-[11px] text-[var(--muted)] mt-1">
          {files.length} file{files.length !== 1 ? 's' : ''}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {files.map((file) => (
          <TreeNode
            key={file.path}
            node={file}
            depth={0}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
          />
        ))}
      </div>
    </div>
  );
}
