import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from '@/components/ui/toaster'
import { MonitoringProvider } from '@/components/monitoring-provider'
import { ErrorBoundary } from '@/lib/monitoring/error-boundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Substack Intelligence',
  description: 'AI-powered venture intelligence platform for consumer VC deal sourcing',
  keywords: ['venture capital', 'startup intelligence', 'AI', 'consumer brands'],
  authors: [{ name: 'Substack Intelligence Team' }],
  creator: 'Substack Intelligence',
  publisher: 'Substack Intelligence',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'Substack Intelligence',
    description: 'AI-powered venture intelligence platform for consumer VC deal sourcing',
    url: '/',
    siteName: 'Substack Intelligence',
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <ErrorBoundary>
            <MonitoringProvider>
              <main className="min-h-screen bg-background">
                {children}
              </main>
              <Toaster />
            </MonitoringProvider>
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  )
}