import { TopNav } from '@/components/layout/TopNav';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function GenerateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex flex-col h-screen">
        <TopNav />
        <div className="flex-1 pt-12">
          {children}
        </div>
      </div>
    </AuthGuard>
  );
}
