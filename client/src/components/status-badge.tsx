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
          label: "Open",
          icon: Clock,
          className: "bg-up/15 text-up border-up/30",
        };
      case "Closed":
        return {
          label: "Closed",
          icon: Lock,
          className: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
        };
      case "Resolved":
        return {
          label: result ? `Resolved: ${result}` : "Resolved",
          icon: CheckCircle,
          className: "bg-primary/15 text-primary border-primary/30",
        };
      case "Cancelled":
        return {
          label: "Cancelled",
          icon: XCircle,
          className: "bg-muted text-muted-foreground border-border",
        };
      default:
        return {
          label: status,
          icon: Clock,
          className: "bg-muted text-muted-foreground border-border",
        };
    }
  };

  const config = getConfig();

  return (
    <Badge
      variant="outline"
      className={`gap-1.5 ${config.className}`}
      data-testid="badge-status"
    >
      <config.icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
