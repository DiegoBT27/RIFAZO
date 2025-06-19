
'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation'; 
import { Ticket, Trophy, Menu as MenuIcon, LogOut, ShieldCheck, Headset, LogIn, UserCircle, UserPlus, Settings, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext'; 
import { cn } from '@/lib/utils';


const ADMIN_WHATSAPP_NUMBER = "584141135956";

interface NavItem {
  href: string;
  label: string;
  icon: JSX.Element;
  roles?: Array<'user' | 'admin' | 'founder'>; 
  public?: boolean; 
}

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isLoggedIn, logout, isLoading: authIsLoading } = useAuth();
  const { theme, toggleTheme } = useTheme(); 
  const pathname = usePathname();
  const router = useRouter();


  if (authIsLoading) return null;

  const allNavItems: NavItem[] = [
    { href: "/", label: "Rifas", icon: <Ticket />, public: true },
    { href: "/results", label: "Resultados", icon: <Trophy />, public: true },
    { href: "/plans", label: "Planes", icon: <ShieldCheck />, public: true },
    { href: "/my-participations", label: "Mis Boletos", icon: <Ticket />, roles: ['user', 'admin', 'founder'] },
    { 
      href: "/admin", 
      label: "Panel de Administrador", 
      icon: <Settings />, 
      roles: ['admin', 'founder'] 
    },
  ];
  
  const getVisibleNavItems = () => {
    if (pathname === '/login' || pathname === '/register') {
      return isLoggedIn
        ? allNavItems.filter(item => item.roles && user && item.roles.includes(user.role) && !item.public)
        : allNavItems.filter(item => item.href === '/plans'); 
    }

    return allNavItems.filter(item => {
      if (item.public) return true;
      if (isLoggedIn && user && item.roles?.includes(user.role)) return true;
      return false;
    });
  };

  const visibleNavItems = getVisibleNavItems();

  const supportButtonDesktop = (
    <Button variant="ghost" size="icon" asChild title="Soporte">
      <a href={`https://wa.me/${ADMIN_WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer">
        <Headset className="h-5 w-5" />
      </a>
    </Button>
  );

  const supportButtonMobile = (
     <SheetClose asChild>
      <a href={`https://wa.me/${ADMIN_WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" onClick={() => setIsMobileMenuOpen(false)}>
        <Button variant="ghost" className="w-full justify-start text-sm py-2.5">
          <Headset className="mr-2 h-5 w-5" /> Soporte
        </Button>
      </a>
    </SheetClose>
  );
  
  const themeToggleButton = (
     <Button variant="ghost" size="icon" onClick={toggleTheme} title={theme === 'light' ? 'Activar Modo Oscuro' : 'Activar Modo Claro'}>
      {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      <span className="sr-only">Cambiar tema</span>
    </Button>
  );
  

  return (
    <header className="bg-card text-card-foreground shadow-md border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl sm:text-2xl font-headline font-bold text-foreground" onClick={() => setIsMobileMenuOpen(false)}>
          RIFAZO
        </Link>

        {!authIsLoading && (
        <nav className="hidden md:flex items-center space-x-1">
          {visibleNavItems.map(item => (
             <Button
              key={item.href}
              variant="ghost"
              size="icon"
              asChild
              title={item.label}
              className={cn(pathname === item.href && "bg-accent text-accent-foreground hover:bg-accent/90")}
             >
              <Link href={item.href}>
                {React.cloneElement(item.icon, { className: "h-5 w-5"})}
              </Link>
            </Button>
          ))}
          
          <div className="ml-1">{themeToggleButton}</div>
          <div className="ml-1">{supportButtonDesktop}</div>


          {!isLoggedIn && pathname !== '/login' && pathname !== '/register' && (
             <Button variant="outline" size="sm" asChild className="h-8 px-3 text-xs ml-1">
              <Link href="/register">
                <UserPlus className="mr-1.5 h-4 w-4"/> Registrarse
              </Link>
            </Button>
          )}
           {!isLoggedIn && pathname !== '/login' && pathname !== '/register' && (
             <Button variant="default" size="sm" asChild className="h-8 px-3 text-xs ml-1">
              <Link href="/login">
                <LogIn className="mr-1.5 h-4 w-4"/> Iniciar Sesión
              </Link>
            </Button>
          )}

          {isLoggedIn && user && (
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title={`Mi Cuenta: ${user.username} (${user.role})`}>
                    <UserCircle className="h-5 w-5" />
                    <span className="sr-only">{user.username} - Mi Cuenta ({user.role})</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="mr-2 w-56 bg-popover text-popover-foreground">
                <DropdownMenuLabel>Mi Cuenta ({user.role})</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive-foreground focus:bg-destructive/90">
                  <LogOut className="mr-2 h-5 w-5" /> Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
        )}

        <div className="md:hidden flex items-center space-x-1">
          <div className="ml-1">{themeToggleButton}</div>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <MenuIcon className="h-6 w-6" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[300px] bg-background text-foreground p-0 flex flex-col">
              <SheetHeader className="p-4 border-b">
                 <SheetTitle className="text-left">
                  <SheetClose asChild>
                    <Link href="/" className="text-xl sm:text-2xl font-headline font-bold text-foreground" onClick={() => setIsMobileMenuOpen(false)}>
                      RIFAZO
                    </Link>
                  </SheetClose>
                </SheetTitle>
                <SheetDescription className="text-left sr-only">Menú principal de navegación de RIFAZO. Accede a rifas, resultados, tu cuenta y soporte.</SheetDescription>
              </SheetHeader>

              <ScrollArea className="flex-grow">
                  <nav className="flex flex-col p-4 space-y-1">
                      {visibleNavItems.map(item => (
                        <SheetClose key={item.label} asChild>
                          <Link href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full justify-start text-sm py-2.5",
                                pathname === item.href && "bg-accent text-accent-foreground hover:bg-accent/90"
                              )}
                            >
                               {React.cloneElement(item.icon, { className: "mr-2 h-5 w-5"})} {item.label}
                            </Button>
                          </Link>
                        </SheetClose>
                      ))}
                      <div className="pt-1">{supportButtonMobile}</div>
                  </nav>

                {isLoggedIn && user ? (
                  <>
                    <div className="p-4 border-t">
                        <div className="flex items-center space-x-3 mb-3">
                            <UserCircle className="h-9 w-9 text-muted-foreground" />
                            <div>
                                <p className="font-semibold text-sm">{user.username}</p>
                                <p className="text-xs text-muted-foreground">{user.role}</p>
                            </div>
                        </div>
                    </div>
                     <DropdownMenuSeparator className="mx-4 bg-border"/>
                     <div className="p-4">
                        <SheetClose asChild>
                            <Button variant="destructive" className="w-full justify-start text-sm py-2.5" onClick={() => { logout(); setIsMobileMenuOpen(false); }}>
                                <LogOut className="mr-2 h-5 w-5" /> Cerrar Sesión
                            </Button>
                        </SheetClose>
                    </div>
                  </>
                ) : (
                   !authIsLoading &&
                  <div className="p-4 border-t space-y-2">
                    {pathname !== '/register' && (
                      <SheetClose asChild>
                        <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                          <Button variant={pathname === '/register' ? 'default' : 'outline'} className="w-full justify-start text-sm py-2.5">
                            <UserPlus className="mr-2 h-5 w-5" /> Registrarse
                          </Button>
                        </Link>
                      </SheetClose>
                    )}
                    {pathname !== '/login' && (
                      <SheetClose asChild>
                        <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                          <Button variant={pathname === '/login' ? 'default' : 'outline'} className="w-full justify-start text-sm py-2.5">
                            <LogIn className="mr-2 h-5 w-5" /> Iniciar Sesión
                          </Button>
                        </Link>
                      </SheetClose>
                    )}
                  </div>
                )}
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
