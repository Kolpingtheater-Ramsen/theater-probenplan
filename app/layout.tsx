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

const assetPrefix =
  process.env.GITHUB_ACTIONS === 'true' ? '/theater-probenplan-prototyp' : '';

export const metadata: Metadata = {
  metadataBase: new URL(
    'https://loggel.github.io/theater-probenplan-prototyp/',
  ),
  title: 'Bühnenplan | Kolpingtheater Ramsen',
  description:
    'Klickprototyp für Proben, Termine, Anwesenheit und Organisation im Theaterverein.',
  openGraph: {
    title: 'Bühnenplan | Kolpingtheater Ramsen',
    description:
      'Klickprototyp für Proben, Termine, Anwesenheit und Organisation im Theaterverein.',
    type: 'website',
    images: [`${assetPrefix}/og.webp`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bühnenplan | Kolpingtheater Ramsen',
    description:
      'Klickprototyp für Proben, Termine, Anwesenheit und Organisation im Theaterverein.',
    images: [`${assetPrefix}/og.webp`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
