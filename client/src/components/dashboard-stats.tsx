import { Activity, TrendingUp, Coins, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { lamportsToSol, type DashboardStats } from "@shared/schema";

interface DashboardStatsProps {
  stats: DashboardStats | null;
  isLoading?: boolean;
}

export function DashboardStatsCards({ stats, isLoading = false }: DashboardStatsProps) {
  const statItems = [
    {
      label: "ACTIVE MARKETS",
      value: stats?.activeMarkets ?? 0,
      format: (v: number) => v.toString(),
      icon: Activity,
      glowClass: "glow-info",
      iconColor: "text-info",
    },
    {
      label: "TOTAL VOLUME",
      value: stats?.totalVolume ?? 0,
      format: (v: number) => `${lamportsToSol(v).toFixed(2)} SOL`,
      icon: TrendingUp,
      glowClass: "glow-up",
      iconColor: "text-up",
    },
    {
      label: "YOUR BETS",
      value: stats?.userActiveBets ?? 0,
      format: (v: number) => v.toString(),
      icon: Coins,
      glowClass: "glow-primary",
      iconColor: "text-primary-foreground",
    },
    {
      label: "CLAIMABLE",
      value: stats?.claimableWinnings ?? 0,
      format: (v: number) => `${lamportsToSol(v).toFixed(2)} SOL`,
      icon: Gift,
      glowClass: "glow-up",
      iconColor: "text-up",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statItems.map((item, i) => (
          <Card key={i} className="border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
              <Skeleton className="mt-3 h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item) => (
        <Card key={item.label} className="border-primary/20 hover:border-primary/40 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-2">
              <span className="terminal-label">{item.label}</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-primary/20 ${item.glowClass}`}>
                <item.icon className={`h-4 w-4 ${item.iconColor}`} />
              </div>
            </div>
            <p className="mt-2 font-mono text-3xl font-bold" data-testid={`stat-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
              {item.format(item.value)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
