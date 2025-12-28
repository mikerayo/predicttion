import { TrendingUp, Clock, Search } from "lucide-react";

interface EmptyStateProps {
  type: "markets" | "positions" | "search";
  title?: string;
  description?: string;
}

export function EmptyState({ type, title, description }: EmptyStateProps) {
  const configs = {
    markets: {
      icon: TrendingUp,
      defaultTitle: "No Active Markets",
      defaultDescription: "Markets are created every 15 minutes. Check back soon for new prediction opportunities.",
    },
    positions: {
      icon: Clock,
      defaultTitle: "No Positions Yet",
      defaultDescription: "Place a bet on an active market to see your positions here.",
    },
    search: {
      icon: Search,
      defaultTitle: "No Results Found",
      defaultDescription: "Try adjusting your search or filters.",
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {title || config.defaultTitle}
      </h3>
      <p className="text-muted-foreground max-w-sm">
        {description || config.defaultDescription}
      </p>
    </div>
  );
}
