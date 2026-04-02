import { LanguageToggle } from '@/components/layout/LanguageToggle';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
        <a href="/" className="font-heading text-lg font-extrabold text-[var(--text)]">
          WebEcho<span className="text-[var(--accent)]">.ai</span>
        </a>
        <LanguageToggle />
      </header>
      {children}
    </div>
  );
}
