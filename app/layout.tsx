import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Can I Run It?',
  description: 'Find out if your running goal is actually realistic.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="noise">{children}</body>
    </html>
  )
}
