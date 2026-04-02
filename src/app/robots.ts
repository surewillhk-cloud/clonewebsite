import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ch007.ai";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/clone/",       // 需登录的克隆流程
          "/dashboard",    // 需登录的控制台
          "/hosting",      // 需登录的托管管理
          "/billing",      // 需登录的账单
          "/settings",     // 需登录的设置
          "/platform-admin", // 平台管理后台
          "/api/",         // API 端点
          "/login",
          "/register",
        ],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/pricing", "/docs"],
        disallow: ["/clone/", "/dashboard", "/hosting", "/billing", "/settings", "/platform-admin", "/api/", "/login", "/register"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
