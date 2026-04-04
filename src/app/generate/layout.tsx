import { AuthGuard } from '@/components/auth/AuthGuard';

export default function GenerateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      {children}
    </AuthGuard>
  );
}
