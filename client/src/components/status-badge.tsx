import { Badge } from "@/components/ui/badge";
import { Clock, Lock, CheckCircle, XCircle } from "lucide-react";
import { type MarketStatusType } from "@shared/schema";

interface StatusBadgeProps {
  status: MarketStatusType;
  result?: string;
}

export function StatusBadge({ status, result }: StatusBadgeProps) {
  const getConfig = () => {
    switch (status) {
      case "Open":
        return {
          label: "LIVE",
          icon: Clock,
          className: "bg-up/10 text-up border-up/30 glow-up",
        };
      case "Closed":
        return {
          label: "CLOSED",
          icon: Lock,
          className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
        };
      case "Resolved":
        const resultLabel = result === "Up" ? "UP WINS" : result === "Down" ? "DOWN WINS" : result === "Push" ? "PUSH" : "RESOLVED";
        const resultClass = result === "Up" ? "bg-up/10 text-up border-up/30" : 
                          result === "Down" ? "bg-down/10 text-down border-down/30" : 
                          "bg-info/10 text-info border-info/30";
        return {
          label: resultLabel,
          icon: CheckCircle,
          className: resultClass,
        };
      case "Cancelled":
        return {
          label: "CANCELLED",
          icon: XCircle,
          className: "bg-muted text-muted-foreground border-border",
        };
      default:
        return {
          label: String(status).toUpperCase(),
          icon: Clock,
          className: "bg-muted text-muted-foreground border-border",
        };
    }
  };

  const config = getConfig();

  return (
    <Badge
      variant="outline"
      className={`gap-1.5 font-mono text-xs tracking-wider ${config.className}`}
      data-testid="badge-status"
    >
      <config.icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
