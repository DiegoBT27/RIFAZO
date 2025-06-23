import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface SectionTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export default function SectionTitle({ children, className, ...props }: SectionTitleProps) {
  return (
    <h1
      className={cn("text-2xl sm:text-3xl font-bold text-foreground mb-6", className)}
      {...props}
    >
      {children}
    </h1>
  );
}
