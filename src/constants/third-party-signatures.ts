/**
 * 第三方服务识别特征库
 * 已扩充至 50+ 个服务
 */

export interface ServiceSignature {
  domains?: string[];
  scriptPatterns?: RegExp[];
  classNames?: string[];
  htmlPatterns?: RegExp[];
}

export const SIGNATURES: Record<string, ServiceSignature> = {
  // 支付
  stripe: { domains: ['js.stripe.com'], scriptPatterns: [/stripe\.js/i], classNames: ['StripeElement'] },
  paypal: { domains: ['paypal.com', 'paypalobjects.com'], scriptPatterns: [/paypal/i] },
  lemonSqueezy: { domains: ['lemonsqueezy.com'], scriptPatterns: [/lemonsqueezy/i] },
  paddle: { domains: ['paddle.com', 'cdn.paddle.com'], scriptPatterns: [/paddle/i] },

  // 登录认证
  clerk: { domains: ['clerk.com', 'clerk.dev'], scriptPatterns: [/clerk\.(com|dev)/i] },
  auth0: { domains: ['auth0.com'], scriptPatterns: [/auth0/i] },
  supabase: { domains: ['supabase.co', 'supabase.in'], scriptPatterns: [/supabase/i] },
  nextAuth: { domains: [], scriptPatterns: [/next-auth|NextAuth/i] },

  // 分析与追踪
  ga4: { domains: ['googletagmanager.com', 'google-analytics.com'], scriptPatterns: [/gtag|ga4|analytics/i] },
  segment: { domains: ['segment.io', 'segment.com'], scriptPatterns: [/segment/i] },
  mixpanel: { domains: ['mixpanel.com'], scriptPatterns: [/mixpanel/i] },
  hotjar: { domains: ['hotjar.com'], scriptPatterns: [/hotjar/i] },
  posthog: { domains: ['posthog.com'], scriptPatterns: [/posthog/i] },
  amplitude: { domains: ['amplitude.com'], scriptPatterns: [/amplitude/i] },
  heap: { domains: ['heapanalytics.com'], scriptPatterns: [/heap\.analytics/i] },
  plausible: { domains: ['plausible.io'], scriptPatterns: [/plausible/i] },
  vercelAnalytics: { domains: ['vercel-insights.com'], scriptPatterns: [/vercel.*insights/i] },

  // 邮件与营销
  mailchimp: { domains: ['list-manage.com', 'mailchimp.com'], scriptPatterns: [/mailchimp/i] },
  convertkit: { domains: ['convertkit.com'], scriptPatterns: [/convertkit/i] },
  resend: { domains: ['resend.com'], scriptPatterns: [/resend/i] },
  sendgrid: { domains: ['sendgrid.net'], scriptPatterns: [/sendgrid/i] },
  mailgun: { domains: ['mailgun.net'], scriptPatterns: [/mailgun/i] },
  hubspot: { domains: ['hubspot.com', 'hs-scripts.com'], scriptPatterns: [/hubspot/i] },
  customerIo: { domains: ['customer.io'], scriptPatterns: [/customer\.io/i] },

  // 客服与聊天
  crisp: { domains: ['client.crisp.chat'], scriptPatterns: [/crisp/i] },
  intercom: { domains: ['intercom.io', 'intercomcdn.com'], scriptPatterns: [/intercom/i] },
  drift: { domains: ['drift.com'], scriptPatterns: [/drift\.com/i] },
  zendesk: { domains: ['zendesk.com'], scriptPatterns: [/zendesk/i] },
  tawk: { domains: ['tawk.to'], scriptPatterns: [/tawk/i] },
  livechat: { domains: ['cdn.livechatinc.com'], scriptPatterns: [/livechat/i] },

  // 评论与社区
  disqus: { domains: ['disqus.com'], scriptPatterns: [/disqus_shortname/i] },
  giscus: { domains: ['giscus.app'], scriptPatterns: [/giscus/i] },
  utterance: { domains: ['utteranc.es'], scriptPatterns: [/utterance/i] },
  commento: { domains: ['commento.io'], scriptPatterns: [/commento/i] },

  // 地图
  googleMaps: { domains: ['maps.googleapis.com'], htmlPatterns: [/<div[^>]+id=["']map/i] },
  mapbox: { domains: ['mapbox.com'], scriptPatterns: [/mapbox/i] },
  leaflet: { domains: [], scriptPatterns: [/leaflet/i], classNames: ['leaflet-container'] },

  // 搜索
  algolia: { domains: ['algolia.net'], scriptPatterns: [/algolia/i] },
  meilisearch: { domains: [], scriptPatterns: [/meilisearch/i] },

  // 表单与调度
  typeform: { domains: ['typeform.com'], scriptPatterns: [/typeform/i] },
  jotform: { domains: ['jotform.com'], scriptPatterns: [/jotform/i] },
  calendly: { domains: ['calendly.com'], scriptPatterns: [/calendly/i] },
  calDotCom: { domains: ['cal.com'], scriptPatterns: [/cal\.com/i] },
  acuity: { domains: ['acuityscheduling.com'], scriptPatterns: [/acuity/i] },

  // CMS 与内容
  contentful: { domains: ['contentful.com'], scriptPatterns: [/contentful/i] },
  sanity: { domains: ['sanity.io'], scriptPatterns: [/sanity/i] },
  strapi: { domains: [], scriptPatterns: [/strapi/i] },

  // 媒体与 CDN
  cloudinary: { domains: ['cloudinary.com'], scriptPatterns: [/cloudinary/i] },
  imgix: { domains: ['imgix.net'], scriptPatterns: [/imgix/i] },

  // 功能与推送
  launchdarkly: { domains: ['launchdarkly.com'], scriptPatterns: [/launchdarkly/i] },
  optimizely: { domains: ['optimizely.com'], scriptPatterns: [/optimizely/i] },
  oneSignal: { domains: ['onesignal.com'], scriptPatterns: [/onesignal/i] },
  firebase: { domains: ['firebase.google.com', 'firebaseio.com'], scriptPatterns: [/firebase/i] },

  // 社交像素
  facebookPixel: { domains: ['connect.facebook.net'], scriptPatterns: [/fbq|facebook.*pixel/i] },
  linkedInInsight: { domains: ['snap.licdn.com'], scriptPatterns: [/linkedin.*insight/i] },
  tiktokPixel: { domains: ['analytics.tiktok.com'], scriptPatterns: [/ttq|tiktok.*pixel/i] },
  twitterPixel: { domains: ['static.ads-twitter.com'], scriptPatterns: [/twq|twitter.*pixel/i] },
  pinterest: { domains: ['pintrk.com'], scriptPatterns: [/pintrk|pinterest/i] },

  // 视频与直播
  vimeo: { domains: ['vimeo.com', 'player.vimeo.com'], scriptPatterns: [/vimeo/i] },
  wistia: { domains: ['fast.wistia.com'], scriptPatterns: [/wistia/i] },
  loom: { domains: ['loom.com'], scriptPatterns: [/loom\.com/i] },
};
