
'use client';

import { Star, StarHalf } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingDisplayProps {
  rating: number;
  maxStars?: number;
  size?: number;
  className?: string;
  starColor?: string;
  emptyStarColor?: string;
}

export default function StarRatingDisplay({
  rating,
  maxStars = 5,
  size = 16,
  className,
  starColor = "text-yellow-400",
  emptyStarColor = "text-muted-foreground/50"
}: StarRatingDisplayProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={cn("flex items-center", className)}>
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} fill="currentColor" size={size} className={cn("shrink-0", starColor)} />
      ))}
      {hasHalfStar && (
        <StarHalf key="half" fill="currentColor" size={size} className={cn("shrink-0", starColor)} />
      )}
      {[...Array(Math.max(0, emptyStars))].map((_, i) => (
        <Star key={`empty-${i}`} size={size} className={cn("shrink-0", emptyStarColor)} />
      ))}
    </div>
  );
}
