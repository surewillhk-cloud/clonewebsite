import Link from 'next/link';

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-[var(--bg)]">{children}</div>;
}
