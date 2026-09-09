import type { Metadata } from 'next';
import { Inter, Noto_Sans_Tamil } from 'next/font/google';
import { ToastProvider } from '@/components/ui/toast';
import { Providers } from '@/app/providers';
import '@/app/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoSansTamil = Noto_Sans_Tamil({
  subsets: ['tamil'],
  variable: '--font-noto-tamil',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Vaikkal — Fresh from farms to your home',
    template: '%s | Vaikkal',
  },
  description:
    'Direct farm-to-home marketplace connecting Indian farmers with households. Transparent pricing, traceable batches, fair pay to farmers.',
  keywords: [
    'farm to home',
    'fresh vegetables',
    'organic produce',
    'Indian farmers',
    'farmers market',
    'agri marketplace',
    'வைக்கல்',
  ],
  authors: [{ name: 'Vaikkal' }],
  openGraph: {
    title: 'Vaikkal — Fresh from farms to your home',
    description: 'Direct farm-to-home marketplace connecting Indian farmers with households.',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoSansTamil.variable} font-sans antialiased`}>
        <ToastProvider />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}