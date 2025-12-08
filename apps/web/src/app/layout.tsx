import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'PadelParrot - Organise Padel Matches',
  description: 'Simplify how you organise and join padel matches. Fast, intuitive, mobile-first.',
  keywords: ['padel', 'matches', 'sports', 'organization', 'booking'],
  authors: [{ name: 'PadelParrot Team' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaf9' },
    { media: '(prefers-color-scheme: dark)', color: '#171717' },
  ],
}

// Script to prevent flash of incorrect theme
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('theme');
      var isDark = theme === 'dark' || 
        (theme === 'system' || !theme) && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } catch (e) {}
  })();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
            {children}
          </div>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'rgb(var(--color-text))',
                color: 'rgb(var(--color-bg))',
                fontSize: '14px',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3) var(--space-4)',
              },
              success: {
                iconTheme: {
                  primary: 'rgb(var(--color-success-text))',
                  secondary: 'rgb(var(--color-bg))',
                },
              },
              error: {
                iconTheme: {
                  primary: 'rgb(var(--color-error-text))',
                  secondary: 'rgb(var(--color-bg))',
                },
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
