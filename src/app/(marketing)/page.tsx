import { getPublicPricing } from '@/lib/platform-admin';
import LandingPageClient from './page-client';

export default async function LandingPage() {
  const pricing = await getPublicPricing();
  return <LandingPageClient pricing={{ onboardingDollar: pricing.onboardingDollar }} />;
}
