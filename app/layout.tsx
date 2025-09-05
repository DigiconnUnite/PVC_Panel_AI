import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import Navigation from '@/components/navigation'
import Footer from '@/components/footer'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wall Panel AI',
  description: 'Created by Digiconn Unite Pvt. Ltd.',
  generator: 'Next.js ',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} flex flex-col max-h-screen min-h-screen`}>
        <Navigation />
        <main className="flex-1 bg-gray-50 pt-16 pb-16">
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  )
}
