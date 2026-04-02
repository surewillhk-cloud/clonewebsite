/**
 * 降级代码生成模板
 * 当检测到第三方服务时，使用预置模板替代 Claude 生成，降低成本并提升稳定性
 * 已扩充至 15+ 种模板
 */

type ColorTheme = { primary?: string; background?: string; text?: string };

const BLOCK_SERVICE_MAP: Record<string, string[]> = {
  pricing: ['stripe', 'paypal'],
  form: ['stripe', 'clerk', 'mailchimp', 'typeform', 'convertkit', 'auth0', 'hubspot'],
  cta: ['stripe', 'mailchimp', 'convertkit'],
  map: ['googleMaps', 'mapbox'],
  testimonials: ['disqus', 'giscus', 'utterance'],
  footer: ['crisp', 'intercom', 'drift', 'zendesk'],
  search: ['algolia'],
  calendar: ['calendly', 'calDotCom'],
  video: ['vimeo', 'wistia', 'loom'],
};

/** 检查区块是否匹配某服务的模板 */
export function getMatchingService(
  blockType: string,
  detectedServices: string[]
): string | null {
  const services = BLOCK_SERVICE_MAP[blockType];
  if (!services) return null;
  return detectedServices.find((s) => services.includes(s.toLowerCase())) ?? null;
}

/** 获取 Stripe 支付区块模板 */
function getStripeTemplate(_blockType: string, colorTheme: ColorTheme): string {
  const primary = colorTheme.primary ?? '#4F7EFF';
  return `// ============================================================
// ⚡ Stripe 支付（预置模板）- 配置 API Key 后生效
// 申请：https://stripe.com/register → Developers → API Keys
// .env.local: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY
// ============================================================

'use client';

export default function Pricing() {
  const handleCheckout = async () => {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId: 'price_xxx' }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="mb-4 text-3xl font-bold">选择方案</h2>
        <p className="mb-8 text-gray-500">配置 Stripe 后即可接受支付</p>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="text-2xl font-bold">基础版</div>
            <div className="mt-2 text-4xl font-extrabold">
              $9<span className="text-lg font-normal text-gray-500">/月</span>
            </div>
            <button
              onClick={handleCheckout}
              className="mt-6 w-full rounded-lg py-3 font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '${primary}' }}
            >
              立即购买
            </button>
          </div>
          <div className="rounded-xl border-2 bg-white p-8 shadow-sm" style={{ borderColor: '${primary}' }}>
            <div className="text-sm font-semibold" style={{ color: '${primary}' }}>推荐</div>
            <div className="mt-1 text-2xl font-bold">专业版</div>
            <div className="mt-2 text-4xl font-extrabold">
              $29<span className="text-lg font-normal text-gray-500">/月</span>
            </div>
            <button
              onClick={handleCheckout}
              className="mt-6 w-full rounded-lg py-3 font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '${primary}' }}
            >
              立即购买
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
`;
}

/** 获取 GA4 分析脚本模板（用于 layout 注入） */
export function getGA4Template(): string {
  return `// ⚡ GA4 分析 - 在 layout.tsx 的 <head> 中注入
// 配置：NEXT_PUBLIC_GA_MEASUREMENT_ID
`;
}

function getClerkFormTemplate(colorTheme: ColorTheme): string {
  const primary = colorTheme.primary ?? '#4F7EFF';
  return `'use client';
export default function Form() {
  return (
    <section className="py-12 px-6">
      <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-xl font-bold">登录 / 注册</h2>
        <p className="mb-4 text-sm text-gray-500">接入 Clerk：https://clerk.com 配置 SignIn/SignUp 组件</p>
        <div className="h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-sm">Clerk SignIn 占位</div>
      </div>
    </section>
  );
}`;
}

function getGoogleMapsTemplate(): string {
  return `'use client';
export default function Map() {
  return (
    <section className="py-12 px-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-4 text-xl font-bold">地图</h2>
        <div className="h-64 rounded-xl border border-gray-200 bg-gray-100 flex items-center justify-center">
          <p className="text-sm text-gray-500">Google Maps: 配置 NEXT_PUBLIC_GOOGLE_MAPS_KEY</p>
        </div>
      </div>
    </section>
  );
}`;
}

function getGiscusTemplate(): string {
  return `'use client';
export default function Testimonials() {
  return (
    <section className="py-12 px-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-4 text-xl font-bold">评论</h2>
        <p className="text-sm text-gray-500">Giscus: 在 giscus.app 创建 repo，注入 script</p>
      </div>
    </section>
  );
}`;
}

function getCrispIntercomTemplate(): string {
  return `'use client';
export default function Footer() {
  return (
    <footer className="py-8 px-6 border-t border-gray-200">
      <p className="text-center text-sm text-gray-500">Crisp/Intercom: 在 layout 中注入客服 script</p>
    </footer>
  );
}`;
}

function getPaypalTemplate(blockType: string, colorTheme: ColorTheme): string {
  const primary = colorTheme.primary ?? '#4F7EFF';
  return `'use client';
export default function Pricing() {
  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="mb-4 text-3xl font-bold">选择方案</h2>
        <p className="mb-8 text-gray-500">接入 PayPal：https://developer.paypal.com 配置 SDK</p>
        <div className="rounded-xl border border-gray-200 bg-white p-8" style={{ borderColor: '${primary}' }}>
          <div className="h-12 rounded-lg flex items-center justify-center text-gray-500" style={{ backgroundColor: 'rgba(79,126,255,0.1)' }}>PayPal 支付按钮占位</div>
        </div>
      </div>
    </section>
  );
}`;
}

function getTypeformTemplate(colorTheme: ColorTheme): string {
  return `'use client';
export default function Form() {
  return (
    <section className="py-12 px-6">
      <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-xl font-bold">表单</h2>
        <p className="text-sm text-gray-500">Typeform: 在 typeform.com 创建表单，嵌入 iframe 或 SDK</p>
      </div>
    </section>
  );
}`;
}

function getMapboxTemplate(): string {
  return `'use client';
export default function Map() {
  return (
    <section className="py-12 px-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-4 text-xl font-bold">地图</h2>
        <div className="h-64 rounded-xl border border-gray-200 bg-gray-100 flex items-center justify-center">
          <p className="text-sm text-gray-500">Mapbox: 配置 NEXT_PUBLIC_MAPBOX_TOKEN</p>
        </div>
      </div>
    </section>
  );
}`;
}

function getAlgoliaSearchTemplate(): string {
  return `'use client';
export default function Search() {
  return (
    <section className="py-12 px-6">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-4 text-xl font-bold">搜索</h2>
        <input type="search" placeholder="搜索..." className="w-full rounded-lg border border-gray-200 px-4 py-3" disabled />
        <p className="mt-2 text-sm text-gray-500">Algolia: 配置 ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY</p>
      </div>
    </section>
  );
}`;
}

function getCalendlyTemplate(): string {
  return `'use client';
export default function Calendar() {
  return (
    <section className="py-12 px-6">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-4 text-xl font-bold">预约</h2>
        <div className="h-96 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center">
          <p className="text-sm text-gray-500">Calendly: 嵌入 calendly.com 预约链接 iframe</p>
        </div>
      </div>
    </section>
  );
}`;
}

function getDriftTemplate(): string {
  return `'use client';
export default function Footer() {
  return (
    <footer className="py-8 px-6 border-t border-gray-200">
      <p className="text-center text-sm text-gray-500">Drift: 在 drift.com 获取 script，注入 layout</p>
    </footer>
  );
}`;
}

function getVimeoTemplate(): string {
  return `'use client';
export default function Video() {
  return (
    <section className="py-12 px-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-4 text-xl font-bold">视频</h2>
        <div className="aspect-video rounded-xl border border-gray-200 bg-gray-100 flex items-center justify-center">
          <p className="text-sm text-gray-500">Vimeo: 嵌入 vimeo.com 视频 ID</p>
        </div>
      </div>
    </section>
  );
}`;
}

function getConvertkitTemplate(colorTheme: ColorTheme): string {
  return `'use client';
export default function Form() {
  return (
    <section className="py-12 px-6">
      <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-xl font-bold">订阅</h2>
        <p className="mb-4 text-sm text-gray-500">ConvertKit: 在 convertkit.com 创建表单，嵌入</p>
        <input type="email" placeholder="邮箱" className="w-full rounded-lg border px-4 py-2 mb-2" />
        <button className="w-full rounded-lg py-2.5 text-white" style={{ backgroundColor: '${colorTheme.primary ?? '#4F7EFF'}' }}>订阅</button>
      </div>
    </section>
  );
}`;
}

function getAuth0FormTemplate(colorTheme: ColorTheme): string {
  return `'use client';
export default function Form() {
  return (
    <section className="py-12 px-6">
      <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-xl font-bold">登录</h2>
        <p className="text-sm text-gray-500">Auth0: 配置 @auth0/auth0-react 或 nextjs-auth0</p>
      </div>
    </section>
  );
}`;
}

function getHubspotFormTemplate(): string {
  return `'use client';
export default function Form() {
  return (
    <section className="py-12 px-6">
      <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-xl font-bold">表单</h2>
        <p className="text-sm text-gray-500">HubSpot: 嵌入 HubSpot 表单 script</p>
      </div>
    </section>
  );
}`;
}

function getUtteranceTemplate(): string {
  return getGiscusTemplate();
}

/** 根据服务和区块类型返回模板代码，无匹配时返回 null */
export function getFallbackCode(
  service: string,
  blockType: string,
  colorTheme: ColorTheme
): string | null {
  const s = service.toLowerCase();
  switch (s) {
    case 'stripe':
      return getStripeTemplate(blockType, colorTheme);
    case 'paypal':
      if (blockType === 'pricing') return getPaypalTemplate(blockType, colorTheme);
      return null;
    case 'clerk':
      if (blockType === 'form') return getClerkFormTemplate(colorTheme);
      return null;
    case 'googlemaps':
      if (blockType === 'map') return getGoogleMapsTemplate();
      return null;
    case 'mapbox':
      if (blockType === 'map') return getMapboxTemplate();
      return null;
    case 'giscus':
    case 'disqus':
      if (blockType === 'testimonials') return getGiscusTemplate();
      return null;
    case 'utterance':
      if (blockType === 'testimonials') return getUtteranceTemplate();
      return null;
    case 'crisp':
    case 'intercom':
      if (blockType === 'footer') return getCrispIntercomTemplate();
      return null;
    case 'drift':
    case 'zendesk':
      if (blockType === 'footer') return getDriftTemplate();
      return null;
    case 'algolia':
      if (blockType === 'search') return getAlgoliaSearchTemplate();
      return null;
    case 'calendly':
    case 'caldotcom':
      if (blockType === 'calendar') return getCalendlyTemplate();
      return null;
    case 'vimeo':
    case 'wistia':
    case 'loom':
      if (blockType === 'video') return getVimeoTemplate();
      return null;
    case 'typeform':
      if (blockType === 'form') return getTypeformTemplate(colorTheme);
      return null;
    case 'convertkit':
      if (blockType === 'form' || blockType === 'cta') return getConvertkitTemplate(colorTheme);
      return null;
    case 'auth0':
      if (blockType === 'form') return getAuth0FormTemplate(colorTheme);
      return null;
    case 'hubspot':
      if (blockType === 'form') return getHubspotFormTemplate();
      return null;
    case 'mailchimp':
      if (blockType === 'form' || blockType === 'cta') return getConvertkitTemplate(colorTheme);
      return null;
    default:
      return null;
  }
}
