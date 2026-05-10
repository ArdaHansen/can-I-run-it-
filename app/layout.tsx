import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Can I Run It?',
  description: 'AI race-readiness, streaks and training plans for runners.',
  icons: { icon: '/favicon.svg' }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="font-sans noise">{children}</body>
    </html>
  );
}
