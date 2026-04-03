import { getPublicPricing } from '@/lib/platform-admin';
import { getLocaleFromRequest } from '@/lib/get-locale';
import { getT } from '@/translations';
import PricingPageClient from './page-client';

export async function generateMetadata() {
  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  return {
    title: `${t.common.pricing} — CH007`,
    description: t.pricingPage.desc,
  };
}

export default async function PricingPage() {
  const pricing = await getPublicPricing();

  return (
    <PricingPageClient
      pricing={{
        cloneRanges: pricing.cloneRanges,
        hostingPlans: pricing.hostingPlans,
        onboardingDollar: pricing.onboardingDollar,
      }}
    />
  );
}
