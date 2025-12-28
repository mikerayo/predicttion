import { Link } from "wouter";
import { Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "./countdown-timer";
import { PriceDisplay } from "./price-display";
import { PoolDistribution } from "./pool-distribution";
import { StatusBadge } from "./status-badge";
import { type Market, lamportsToSol } from "@shared/schema";

interface MarketCardProps {
  market: Market;
  onRefresh?: () => void;
}

export function MarketCard({ market, onRefresh }: MarketCardProps) {
  const formatTimestamp = (ts: number) => {
    const date = new Date(ts * 1000);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Madrid",
    });
  };

  const poolTotal = market.totalUp + market.totalDown;
  const isOpen = market.status === "Open";
  const isResolved = market.status === "Resolved";

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md" data-testid={`card-market-${market.publicKey.slice(0, 8)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="font-mono">
              {formatTimestamp(market.startTs)} - {formatTimestamp(market.endTs)}
            </span>
          </div>
          <StatusBadge status={market.status} result={market.result !== "Unset" ? market.result : undefined} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <PriceDisplay
            price={market.startPrice}
            expo={market.startExpo}
            label="Start Price"
            size="sm"
          />
          {isResolved && market.endPrice !== null && market.endExpo !== null ? (
            <PriceDisplay
              price={market.endPrice}
              expo={market.endExpo}
              label="End Price"
              size="sm"
              showChange
              previousPrice={market.startPrice}
              previousExpo={market.startExpo}
            />
          ) : (
            <div className="text-right">
              <span className="text-xs text-muted-foreground">End Price</span>
              <p className="font-mono text-lg font-bold text-muted-foreground">--</p>
            </div>
          )}
        </div>

        <PoolDistribution totalUp={market.totalUp} totalDown={market.totalDown} />

        <div className="flex items-center justify-between gap-4 pt-2 border-t">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Pool</p>
              <p className="font-mono font-semibold">
                {lamportsToSol(poolTotal).toFixed(2)} SOL
              </p>
            </div>
          </div>

          {isOpen && (
            <CountdownTimer endTs={market.endTs} onExpire={onRefresh} size="sm" />
          )}
        </div>

        <Link href={`/market/${market.publicKey}`}>
          <Button variant="outline" className="w-full gap-2" data-testid="button-view-market">
            {isOpen ? "Place Bet" : "View Details"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
