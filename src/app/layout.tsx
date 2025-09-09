import type { Metadata } from 'next';
import { Inter, Roboto } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import PageLoader from '@/components/layout/PageLoader';
import React from 'react';
import { cn } from '@/lib/utils';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'RIFAZO',
  description: 'Participa en la mejor APP de Rifas',
  manifest: '/manifest.json',
  icons: {
    apple: "/icons/icon-192x192.png",
    icon: "/icons/icon-192x192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased flex flex-col', roboto.variable)}>
        <ThemeProvider>
          <AuthProvider>
            <Header />
            <main className="flex-grow container mx-auto px-4 pt-[100px] pb-8 max-w-5xl">
              {children}
            </main>
            <React.Suspense fallback={<div></div>}>
               <Footer />
            </React.Suspense>
            <Toaster />
            <PageLoader />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
