import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatPrice } from "@shared/schema";

interface PriceDisplayProps {
  price: number;
  expo: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  showChange?: boolean;
  previousPrice?: number;
  previousExpo?: number;
}

export function PriceDisplay({
  price,
  expo,
  label,
  size = "md",
  showChange = false,
  previousPrice,
  previousExpo,
}: PriceDisplayProps) {
  const formattedPrice = formatPrice(price, expo);
  
  const getChangeIndicator = () => {
    if (!showChange || previousPrice === undefined || previousExpo === undefined) {
      return null;
    }
    
    const currentValue = price * Math.pow(10, expo);
    const previousValue = previousPrice * Math.pow(10, previousExpo);
    
    if (currentValue > previousValue) {
      return {
        icon: TrendingUp,
        color: "text-up",
        label: "UP",
      };
    } else if (currentValue < previousValue) {
      return {
        icon: TrendingDown,
        color: "text-down",
        label: "DOWN",
      };
    } else {
      return {
        icon: Minus,
        color: "text-muted-foreground",
        label: "PUSH",
      };
    }
  };

  const sizeClasses = {
    sm: {
      container: "gap-1",
      label: "text-xs",
      price: "text-lg",
      icon: "h-4 w-4",
    },
    md: {
      container: "gap-1.5",
      label: "text-sm",
      price: "text-2xl",
      icon: "h-5 w-5",
    },
    lg: {
      container: "gap-2",
      label: "text-base",
      price: "text-4xl",
      icon: "h-6 w-6",
    },
  };

  const classes = sizeClasses[size];
  const change = getChangeIndicator();

  return (
    <div className={`flex flex-col ${classes.container}`}>
      {label && (
        <span className={`${classes.label} text-muted-foreground font-medium`}>
          {label}
        </span>
      )}
      <div className="flex items-center gap-2">
        <span className={`font-mono font-bold ${classes.price}`} data-testid="text-price">
          ${formattedPrice}
        </span>
        {change && (
          <div className={`flex items-center gap-1 ${change.color}`}>
            <change.icon className={classes.icon} />
            <span className={`${classes.label} font-semibold`}>{change.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
