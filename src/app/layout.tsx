import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { getLocaleFromRequest } from "@/lib/get-locale";
import { syne, dmSans, notoSansSC } from "@/lib/fonts";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ch007.ai";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "CH007 — AI 一键克隆网站 | Website Clone in 10 Minutes",
    template: "%s", // 子页面可单独设置 title，如 "定价 — CH007"
  },
  description:
    "输入任意网站 URL，AI 自动分析结构、识别功能、生成完整 Next.js 代码。10 分钟交付。支持 Stripe、地图、登录等 50+ 第三方服务识别。",
  keywords: [
    "AI 克隆网站",
    "网站克隆",
    "Next.js 生成",
    "Website clone",
    "AI website builder",
    "克隆网站",
    "出海",
  ],
  authors: [{ name: "CH007", url: baseUrl }],
  creator: "CH007",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: baseUrl,
    siteName: "CH007",
    title: "CH007 — AI 一键克隆网站",
    description:
      "输入任意网站 URL，AI 自动分析结构、识别功能、生成完整 Next.js 代码。10 分钟交付。",
    // 可选：将 1200x630 的 og-image.png 放入 public/ 以启用社交分享预览
    // images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "CH007" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CH007 — AI 一键克隆网站",
    description: "输入 URL，AI 生成完整 Next.js 代码。10 分钟交付。",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: baseUrl,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocaleFromRequest();
  return (
    <html lang={locale} suppressHydrationWarning className={`${syne.variable} ${dmSans.variable} ${notoSansSC.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "CH007",
              description: "AI 驱动的智能网站克隆平台，输入 URL 即可生成完整 Next.js 代码。",
              url: baseUrl,
              applicationCategory: "DeveloperApplication",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              featureList: [
                "三层爬虫降级策略",
                "第三方服务识别 50+",
                "一键 Railway 托管",
                "APP 克隆（截图/APK/流量）",
              ],
            }),
          }}
        />
      </head>
      <body className="antialiased">
        <LocaleProvider initialLocale={locale}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
