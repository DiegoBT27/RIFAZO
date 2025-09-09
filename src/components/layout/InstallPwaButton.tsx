
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface InstallPwaButtonProps {
  isMobile?: boolean;
}

export default function InstallPwaButton({ isMobile = false }: InstallPwaButtonProps) {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setInstallPromptEvent(null); // Don't show the button if already installed
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPromptEvent) return;

    installPromptEvent.prompt();
    installPromptEvent.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      setInstallPromptEvent(null);
    });
  };

  if (!installPromptEvent) {
    return null;
  }

  if (isMobile) {
    return (
        <Button 
            onClick={handleInstallClick} 
            className="w-full justify-start text-sm py-2.5 bg-accent text-accent-foreground hover:bg-accent/90"
        >
            <Download className="mr-2 h-5 w-5"/> Instalar Aplicación
        </Button>
    );
  }

  return (
    <Button
      onClick={handleInstallClick}
      variant="default"
      size="sm"
      className="h-8 px-3 text-xs ml-1 bg-accent text-accent-foreground hover:bg-accent/90"
    >
      <Download className="mr-1.5 h-4 w-4" /> Instalar App
    </Button>
  );
}
