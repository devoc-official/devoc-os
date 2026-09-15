import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'DeVoc OS — Enterprise Business Operating System',
  description: 'Unifying People, Learning, Evaluation, Work, Projects, Finance, and Analytics.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-devoc-bg text-devoc-text-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
