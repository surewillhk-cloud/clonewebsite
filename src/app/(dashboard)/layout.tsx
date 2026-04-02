import { Sidebar } from '@/components/layout/Sidebar';
import { ReferralBinder } from '@/components/referral/ReferralBinder';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <ReferralBinder />
        <Sidebar />
        <main className="ml-[240px] flex-1 transition-all duration-300">{children}</main>
      </div>
    </AuthGuard>
  );
}
