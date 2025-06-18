
'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingInputProps {
  count?: number;
  value: number;
  onChange: (value: number) => void;
  size?: number;
  color?: string;
  hoverColor?: string;
  className?: string;
  disabled?: boolean;
}

export default function StarRatingInput({
  count = 5,
  value,
  onChange,
  size = 24,
  color = "text-muted-foreground",
  hoverColor = "text-yellow-400",
  className,
  disabled = false,
}: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = useState<number | undefined>(undefined);

  const stars = Array(count).fill(0);

  const handleClick = (newValue: number) => {
    if (disabled) return;
    onChange(newValue);
  };

  const handleMouseOver = (newHoverValue: number) => {
    if (disabled) return;
    setHoverValue(newHoverValue);
  };

  const handleMouseLeave = () => {
    if (disabled) return;
    setHoverValue(undefined);
  };

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      {stars.map((_, index) => {
        const starValue = index + 1;
        const isFilled = (hoverValue || value) >= starValue;
        
        return (
          <Star
            key={index}
            size={size}
            className={cn(
              "cursor-pointer transition-colors",
              isFilled ? hoverColor : color,
              disabled && "cursor-not-allowed opacity-70"
            )}
            fill={isFilled ? "currentColor" : "none"}
            onClick={() => handleClick(starValue)}
            onMouseOver={() => handleMouseOver(starValue)}
            onMouseLeave={handleMouseLeave}
          />
        );
      })}
    </div>
  );
}
