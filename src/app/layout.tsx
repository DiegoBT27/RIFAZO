import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import PageLoader from '@/components/layout/PageLoader';
import React from 'react';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'RIFAZO',
  description: 'Participa en la mejor APP de Rifas',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head />
      <body className={cn('min-h-screen bg-background font-sans antialiased', inter.variable)}>
        <ThemeProvider>
          <AuthProvider>
            <Header />
            <main className="flex-grow container mx-auto px-4 pt-[100px] pb-8">
              {children}
            </main>
            <Footer />
            <Toaster />
            <PageLoader />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
