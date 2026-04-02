import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/platform-admin/auth';
import { getTaskDetail } from '@/lib/platform-admin/task-detail';
import { getLocaleFromRequest } from '@/lib/get-locale';
import { getT } from '@/translations';
import { TaskDetailClient } from './TaskDetailClient';

export async function generateMetadata() {
  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  return { title: `${t.tasksAdmin.taskCostDetail} — ${t.platformAdmin.title}` };
}

export default async function PlatformAdminTaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const admin = await getAdminSession();
  if (!admin) redirect('/platform-admin/login');

  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  const ta = t.tasksAdmin;

  const { taskId } = await params;
  const data = await getTaskDetail(taskId);
  if (!data) notFound();

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/platform-admin/tasks"
              className="text-[14px] text-[var(--muted)] hover:text-[var(--text)]"
            >
              {ta.backToTasks}
            </Link>
            <h1 className="font-heading text-xl font-bold">{ta.taskCostDetail}</h1>
          </div>
          <span className="text-[13px] text-[var(--muted)]">{admin.email}</span>
        </div>
      </header>

      <main className="max-w-[800px] px-8 py-10">
        <TaskDetailClient data={data} />
      </main>
    </div>
  );
}
