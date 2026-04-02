/**
 * 字体优化：使用 next/font 自托管，消除外部请求，减少 LCP
 */
import { Syne, DM_Sans, Noto_Sans_SC } from 'next/font/google';

export const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  display: 'swap',
  variable: '--font-syne',
});

export const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
  variable: '--font-dm-sans',
});

export const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sc',
});
