import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegister from '@/lib/sw-register'

export const metadata: Metadata = {
  title: 'ArchangelTCG',
  description: 'Trade cards with local players',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ArchangelTCG',
  },
  icons: {
    apple: '/icons/icon-192.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-gray-950 text-white antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
