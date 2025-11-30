import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'PadelParrot - Organise Padel Matches',
  description: 'Simplify how you organise and join padel matches. Fast, intuitive, mobile-first.',
  keywords: ['padel', 'matches', 'sports', 'organization', 'booking'],
  authors: [{ name: 'PadelParrot Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#ef6b00',
  manifest: '/manifest.json',
  openGraph: {
    title: 'PadelParrot - Organise Padel Matches',
    description: 'Simplify how you organise and join padel matches',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PadelParrot - Organise Padel Matches',
    description: 'Simplify how you organise and join padel matches',
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
        <div className="min-h-screen bg-stone-50">
          {children}
        </div>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#292524',
              color: '#fafaf9',
              fontSize: '14px',
              borderRadius: '6px',
              padding: '12px 16px',
            },
            success: {
              style: {
                background: '#292524',
              },
              iconTheme: {
                primary: '#ef6b00',
                secondary: '#fafaf9',
              },
            },
            error: {
              style: {
                background: '#292524',
              },
              iconTheme: {
                primary: '#cf5c4d',
                secondary: '#fafaf9',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
