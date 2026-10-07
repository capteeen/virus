import type { Metadata } from 'next';
import './globals.css';
import theme from '@/themes';
import ThemeStyle from '@/components/ThemeStyle';
import Providers from '@/components/Providers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? `https://${theme.site.domain}`),
  title: `${theme.name} — ${theme.copy.eyebrow}`,
  description: theme.copy.tagline,
  openGraph: { title: theme.name, description: theme.copy.tagline, siteName: theme.site.domain },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <ThemeStyle />
      </head>
      <body>
        <Providers>
          <Header />
          <main className="min-h-[70vh]">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
