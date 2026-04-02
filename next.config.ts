import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  // 优化包导入，减小 bundle 体积
  experimental: {
    optimizePackageImports: [
      '@supabase/supabase-js',
      '@anthropic-ai/sdk',
      '@aws-sdk/client-s3',
      '@octokit/rest',
      'resend',
    ],
  },
};

export default nextConfig;
