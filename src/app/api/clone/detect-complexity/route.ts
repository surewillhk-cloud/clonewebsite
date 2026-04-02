/**
 * POST /api/clone/detect-complexity
 * 检测网站复杂度，返回消耗额度数
 */

import { NextRequest, NextResponse } from 'next/server';
import { detectComplexity } from '@/lib/analyzer/complexity-detector';
import { CREDITS_APP_SCREENSHOT, CREDITS_APP_APK, CREDITS_APP_TRAFFIC } from '@/constants/plans';
import { getPricingConfig, getClonePriceRange, getAppPriceRange } from '@/lib/platform-admin';
import { ensureProfile } from '@/lib/profiles';
import { getAuthUserId } from '@/lib/api-auth';
import { validateScrapeUrl } from '@/lib/url-validate';
import { z } from 'zod';

const schema = z.object({
  url: z.string().url().optional(),
  cloneType: z.enum(['web', 'app']).optional(),
  appAnalyzeMode: z.enum(['screenshot', 'apk', 'traffic']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { url, cloneType, appAnalyzeMode } = parsed.data;

    if (cloneType === 'app') {
      const mode = appAnalyzeMode ?? 'screenshot';
      const creditsByMode = {
        screenshot: CREDITS_APP_SCREENSHOT,
        apk: CREDITS_APP_APK,
        traffic: CREDITS_APP_TRAFFIC,
      };
      const creditsRequired = creditsByMode[mode];
      const featureLabels: Record<string, string> = {
        screenshot: 'app_screenshot',
        apk: 'app_apk',
        traffic: 'app_apk_traffic',
      };
      let userCreditsBalance = 0;
      let canProceed = true;
      const authUserId = await getAuthUserId(req);
      if (authUserId) {
        const profile = await ensureProfile(authUserId, undefined);
        userCreditsBalance = profile?.credits ?? 0;
        canProceed = userCreditsBalance >= creditsRequired;
      }
      const config = await getPricingConfig();
      const appMode = mode === 'screenshot' ? 'screenshot' : mode === 'apk' ? 'apk' : 'traffic';
      const priceCents = getAppPriceRange(config, appMode);
      return NextResponse.json({
        complexity: 'static_single',
        creditsRequired,
        userCreditsBalance,
        canProceed,
        detectedFeatures: [featureLabels[mode]],
        estimatedPriceRange: `$${(priceCents.minCents / 100).toFixed(0)} - $${(priceCents.maxCents / 100).toFixed(0)}`,
        priceRangeCents: { min: priceCents.minCents, max: priceCents.maxCents },
      });
    }

    if (!url) {
      return NextResponse.json({ error: 'url required for web clone' }, { status: 400 });
    }

    const urlCheck = validateScrapeUrl(url);
    if (!urlCheck.ok) {
      return NextResponse.json(
        { error: urlCheck.error ?? 'Invalid URL' },
        { status: 400 }
      );
    }

    const result = await detectComplexity(url);

    let userCreditsBalance = 0;
    let canProceed = true;
    const authUserId = await getAuthUserId(req);
    if (authUserId) {
      const profile = await ensureProfile(authUserId, undefined);
      userCreditsBalance = profile?.credits ?? 0;
      canProceed = userCreditsBalance >= result.creditsRequired;
    }

    const config = await getPricingConfig();
    const priceRange = getClonePriceRange(config, result.complexity);
    const minPrice = (priceRange.min / 100).toFixed(0);
    const maxPrice = (priceRange.max / 100).toFixed(0);

    return NextResponse.json({
      complexity: result.complexity,
      creditsRequired: result.creditsRequired,
      userCreditsBalance,
      canProceed,
      detectedFeatures: result.detectedFeatures,
      estimatedPriceRange: `$${minPrice} - $${maxPrice}`,
      priceRangeCents: { min: priceRange.min, max: priceRange.max },
    });
  } catch (err) {
    console.error('[detect-complexity]', err);
    return NextResponse.json(
      { error: 'Complexity detection failed' },
      { status: 500 }
    );
  }
}
