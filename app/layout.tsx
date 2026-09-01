import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const assetPrefix = process.env.STATIC_PAGES_BASE_PATH ?? '';

export const metadata: Metadata = {
  metadataBase: new URL('https://loggel.github.io/'),
  title: 'Bühnenplan | Kolpingtheater Ramsen',
  description:
    'Proben, Termine, Rückmeldungen und Anwesenheit für das Kolpingtheater Ramsen.',
  icons: {
    icon: `${assetPrefix}/theater-logo.png`,
    apple: `${assetPrefix}/theater-logo.png`,
  },
  openGraph: {
    title: 'Bühnenplan | Kolpingtheater Ramsen',
    description:
      'Proben, Termine und Anwesenheit für die Creepshow des Kolpingtheaters Ramsen.',
    type: 'website',
    images: [`${assetPrefix}/og.webp`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bühnenplan | Kolpingtheater Ramsen',
    description:
      'Proben, Termine und Anwesenheit für die Creepshow des Kolpingtheaters Ramsen.',
    images: [`${assetPrefix}/og.webp`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
