import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'PadelParrot - Organise Padel Matches',
  description: 'Simplify how you organise and join padel matches. Fast, intuitive, mobile-first.',
  keywords: ['padel', 'matches', 'sports', 'organization', 'booking'],
  authors: [{ name: 'PadelParrot Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#1c1917', // stone-900
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
        <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
          {children}
        </div>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'rgb(28 25 23)', // --color-text
              color: 'rgb(250 250 249)',   // --color-bg
              fontSize: '14px',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3) var(--space-4)',
            },
            success: {
              iconTheme: {
                primary: 'rgb(46 125 50)',  // --color-success-text
                secondary: 'rgb(250 250 249)',
              },
            },
            error: {
              iconTheme: {
                primary: 'rgb(198 40 40)',  // --color-error-text
                secondary: 'rgb(250 250 249)',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
