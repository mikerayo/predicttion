import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  endTs: number;
  onExpire?: () => void;
  size?: "sm" | "md" | "lg";
}

export function CountdownTimer({ endTs, onExpire, size = "md" }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    const calculateRemaining = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, endTs - now);
      setTimeRemaining(remaining);
      
      if (remaining === 0 && onExpire) {
        onExpire();
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [endTs, onExpire]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getUrgencyStyles = () => {
    if (timeRemaining <= 60) return "text-down countdown-pulse";
    if (timeRemaining <= 180) return "text-yellow-400";
    return "text-info";
  };

  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  if (timeRemaining === 0) {
    return (
      <div className={`flex items-center gap-2 font-mono font-bold ${sizeClasses[size]} text-muted-foreground`}>
        <Clock className={iconSizes[size]} />
        <span>ENDED</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 font-mono font-bold ${sizeClasses[size]} ${getUrgencyStyles()}`}>
      <Clock className={iconSizes[size]} />
      <span data-testid="text-countdown">{formatTime(timeRemaining)}</span>
    </div>
  );
}
