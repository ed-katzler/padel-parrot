import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'PadelParrot - Organise Padel Matches',
  description: 'Simplify how you organize and join padel matches. Fast, intuitive, mobile-first.',
  keywords: ['padel', 'matches', 'sports', 'organization', 'booking'],
  authors: [{ name: 'PadelParrot Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#0ea5e9',
  manifest: '/manifest.json',
  openGraph: {
    title: 'PadelParrot - Organize Padel Matches',
    description: 'Simplify how you organize and join padel matches',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PadelParrot - Organize Padel Matches',
    description: 'Simplify how you organize and join padel matches',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#22c55e',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
      </body>
    </html>
  )
} 