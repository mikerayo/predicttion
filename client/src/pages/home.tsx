import { useQuery } from "@tanstack/react-query";
import { DashboardStatsCards } from "@/components/dashboard-stats";
import { MarketCard } from "@/components/market-card";
import { MarketListSkeleton } from "@/components/market-skeleton";
import { EmptyState } from "@/components/empty-state";
import { type Market, type DashboardStats } from "@shared/schema";

export default function Home() {
  const {
    data: markets,
    isLoading: marketsLoading,
    refetch: refetchMarkets,
  } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
    refetchInterval: 10000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
    refetchInterval: 30000,
  });

  const activeMarkets = markets?.filter((m) => m.status === "Open") ?? [];
  const closedMarkets = markets?.filter((m) => m.status !== "Open") ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">SOL/USD Prediction Markets</h1>
          <p className="text-lg text-muted-foreground">
            15-minute prediction markets. Bet UP or DOWN on SOL price movement.
          </p>
        </div>

        <DashboardStatsCards stats={stats ?? null} isLoading={statsLoading} />

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold">Active Markets</h2>
            {activeMarkets.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {activeMarkets.length} market{activeMarkets.length !== 1 ? "s" : ""} open
              </span>
            )}
          </div>

          {marketsLoading ? (
            <MarketListSkeleton count={3} />
          ) : activeMarkets.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {activeMarkets.map((market) => (
                <MarketCard
                  key={market.publicKey}
                  market={market}
                  onRefresh={() => refetchMarkets()}
                />
              ))}
            </div>
          ) : (
            <EmptyState type="markets" />
          )}
        </section>

        {closedMarkets.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Recent Markets</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {closedMarkets.slice(0, 6).map((market) => (
                <MarketCard
                  key={market.publicKey}
                  market={market}
                  onRefresh={() => refetchMarkets()}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
