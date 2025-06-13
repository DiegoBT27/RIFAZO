
'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation'; // Changed import
import { Loader2 } from 'lucide-react';

export default function PageLoader() {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const previousPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    // Only show loader if the pathname has actually changed from the previous one.
    // previousPathnameRef.current will be null on the very first render.
    if (previousPathnameRef.current !== null && previousPathnameRef.current !== pathname) {
      setIsNavigating(true);
    }
    
    // Update the ref to the current pathname for the next comparison.
    previousPathnameRef.current = pathname;

    // Hide loader after a delay.
    // This is a simplified way to provide feedback for client-side navigation.
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 500); // Adjust delay as needed (e.g., 500ms)

    return () => {
      clearTimeout(timer);
    };
  }, [pathname]);

  if (!isNavigating) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[5000]">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
    </div>
  );
}
