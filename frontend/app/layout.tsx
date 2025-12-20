import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import './globals.css'

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

export const metadata: Metadata = {
  title: 'Lecture to Slides',
  description: 'Transform your lectures into professional slide presentations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={plusJakarta.className}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}