
'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation'; 
import { Loader2 } from 'lucide-react';

export default function PageLoader() {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const previousPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    
    if (previousPathnameRef.current !== null && previousPathnameRef.current !== pathname) {
      setIsNavigating(true);
    }
    
    
    previousPathnameRef.current = pathname;

    
    
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 500); 

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
