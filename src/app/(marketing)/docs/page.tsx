import { Metadata } from 'next';
import Link from 'next/link';
import { getLocaleFromRequest } from '@/lib/get-locale';
import { getT } from '@/translations';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  return {
    title: `${t.docs.title} | CH007`,
    description: t.docs.desc,
  };
}

export default async function DocsPage() {
  const locale = await getLocaleFromRequest();
  const t = getT(locale);

  return (
    <div className="mx-auto max-w-[800px] px-8 py-16">
      <h1 className="font-heading text-3xl font-extrabold">{t.docs.title}</h1>
      <p className="mt-2 text-[var(--muted)]">{t.docs.desc}</p>

      <div className="mt-12 space-y-8">
        <section>
          <h2 className="font-heading text-xl font-bold">{t.docs.quickStart}</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-6 text-[15px] leading-relaxed text-[var(--muted)]">
            {t.docs.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold">{t.docs.loginSite}</h2>
          <p className="mt-2 text-[15px] text-[var(--muted)]">{t.docs.loginSiteDesc}</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold">{t.docs.hosting}</h2>
          <p className="mt-2 text-[15px] text-[var(--muted)]">{t.docs.hostingDesc}</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold">{t.docs.thirdParty}</h2>
          <p className="mt-2 text-[15px] text-[var(--muted)]">{t.docs.thirdPartyDesc}</p>
        </section>

        <Link
          href="/clone/new"
          className="mt-8 inline-block rounded-lg bg-[var(--accent)] px-6 py-3 text-[14px] font-medium text-white hover:bg-[#6B91FF]"
        >
          {t.docs.startClone}
        </Link>
      </div>
    </div>
  );
}
