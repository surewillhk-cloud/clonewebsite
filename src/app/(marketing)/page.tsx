import { getPublicPricing } from '@/lib/platform-admin';
import { getLocaleFromRequest } from '@/lib/get-locale';
import { getT } from '@/translations';
import LandingPageClient from './page-client';

export default async function LandingPage() {
  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  const pricing = await getPublicPricing();

  return <LandingPageClient t={t} pricing={{ onboardingDollar: pricing.onboardingDollar }} />;
}
