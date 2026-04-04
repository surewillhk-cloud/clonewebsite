'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  files?: { path: string; content: string }[];
}

interface ChatPanelProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  onSendMessage: (content: string) => void;
}

export function ChatPanel({ messages, isStreaming, streamingContent, onSendMessage }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSendMessage(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-faint)]">
        <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--muted-dark)]">
          AI Assistant
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !streamingContent && (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">🤖</div>
            <div className="text-[13px] text-[var(--text-secondary)] mb-2">
              Describe what you want to build
            </div>
            <div className="text-[12px] text-[var(--muted)]">
              e.g. "Create a landing page for a SaaS product"
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[90%] rounded-xl px-4 py-3 text-[13px] leading-[1.6] ${
                msg.role === 'user'
                  ? 'bg-[var(--accent)] text-white rounded-br-sm'
                  : msg.role === 'system'
                  ? 'bg-[var(--red-soft)] text-[var(--red)] border border-[var(--red)]/20'
                  : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border-faint)]'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.files && msg.files.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--border-faint)]">
                  <div className="text-[11px] text-[var(--muted)] mb-1">
                    📄 {msg.files.length} file{msg.files.length !== 1 ? 's' : ''} generated
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {msg.files.map((f) => (
                      <span
                        key={f.path}
                        className="text-[10px] bg-[var(--accent-soft)] text-[var(--accent)] px-2 py-0.5 rounded-full"
                      >
                        {f.path.split('/').pop()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isStreaming && streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-xl px-4 py-3 text-[13px] leading-[1.6] bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border-faint)]">
              <div className="whitespace-pre-wrap">{streamingContent}</div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                <span className="text-[11px] text-[var(--muted)]">Generating...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border-faint)] p-4">
        <div className="flex items-end gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-2 focus-within:border-[var(--accent)] focus-within:shadow-[0_0_20px_rgba(249,115,22,0.1)] transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleTextareaInput}
            placeholder="Describe what to build or modify..."
            rows={1}
            className="flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--muted-dark)] resize-none max-h-[120px] px-2 py-1.5"
            disabled={isStreaming}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isStreaming}
            className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
              input.trim() && !isStreaming
                ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white shadow-sm hover:shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                : 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </button>
        </div>
        <div className="text-[10px] text-[var(--muted-dark)] mt-2 text-center">
          Press Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
