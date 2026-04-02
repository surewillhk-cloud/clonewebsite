import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/platform-admin/auth';
import Link from 'next/link';

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login page is at /platform-admin/login - we'll check in each non-login page
  return <div className="min-h-screen bg-[var(--bg)]">{children}</div>;
}
