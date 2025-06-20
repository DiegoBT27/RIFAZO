
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext'; // Import ThemeProvider
import PageLoader from '@/components/layout/PageLoader';
import React from 'react'; // Ensure React is imported

export const metadata: Metadata = {
  title: 'RIFAZO',
  description: 'Participa en la mejor APP de Rifas',
};

export default function RootLayout({
  children,
  params: receivedParams, // Add params to the signature
  searchParams: receivedSearchParams
}: Readonly<{
  children: React.ReactNode;
  params?: { [key: string]: string | string[] | undefined }; // Make params optional
  searchParams?: { [key: string]: string | string[] | undefined };
}>) {

  // Unwrap params and searchParams if received
  // This is a pattern to ensure dynamic data is handled correctly by Next.js
  // when its properties might be enumerated directly in Server Components.
  const params = receivedParams ? React.use(receivedParams) : undefined;
  const searchParams = receivedSearchParams ? React.use(receivedSearchParams) : undefined;

  // Example: If you needed to log or use the keys of params or searchParams in RootLayout.
  // This specific logging is for demonstration and generally not done in RootLayout.
  if (typeof window === 'undefined') { // Check for server-side execution
    if (params) {
      const paramKeys = Object.keys(params);
      if (paramKeys.length > 0) {
        // console.log("RootLayout accessed params keys (server-side):", paramKeys);
      }
    }
    if (searchParams) {
      const searchParamKeys = Object.keys(searchParams);
      if (searchParamKeys.length > 0) {
        // console.log("RootLayout accessed searchParams keys (server-side):", searchParamKeys);
      }
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <ThemeProvider> {/* Wrap AuthProvider with ThemeProvider */}
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
