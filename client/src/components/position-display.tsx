import { TrendingUp, TrendingDown, CheckCircle, Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  lamportsToSol,
  calculatePotentialPayout,
  type Position,
  type Market,
  type MarketResultType,
} from "@shared/schema";

interface PositionDisplayProps {
  position: Position;
  market: Market;
  onClaim: () => Promise<void>;
  isPending?: boolean;
}

export function PositionDisplay({
  position,
  market,
  onClaim,
  isPending = false,
}: PositionDisplayProps) {
  const hasUpBet = position.upNet > 0;
  const hasDownBet = position.downNet > 0;
  const totalBet = position.upNet + position.downNet;
  const poolTotal = market.totalUp + market.totalDown;

  const calculatePayout = (): number => {
    if (market.status !== "Resolved") return 0;

    switch (market.result as MarketResultType) {
      case "Up":
        return calculatePotentialPayout(position.upNet, market.totalUp, poolTotal);
      case "Down":
        return calculatePotentialPayout(position.downNet, market.totalDown, poolTotal);
      case "Push":
        return position.upNet + position.downNet;
      default:
        return 0;
    }
  };

  const calculatePotentialPayouts = () => {
    const upPayout = hasUpBet
      ? calculatePotentialPayout(position.upNet, market.totalUp + position.upNet, poolTotal + position.upNet)
      : 0;
    const downPayout = hasDownBet
      ? calculatePotentialPayout(position.downNet, market.totalDown + position.downNet, poolTotal + position.downNet)
      : 0;
    return { upPayout, downPayout };
  };

  const payout = calculatePayout();
  const { upPayout, downPayout } = calculatePotentialPayouts();
  
  const canClaim =
    market.status === "Resolved" &&
    !position.claimed &&
    payout > 0;

  const getResultBadge = () => {
    if (market.status !== "Resolved") return null;

    const isWinner =
      (market.result === "Up" && hasUpBet) ||
      (market.result === "Down" && hasDownBet) ||
      market.result === "Push";

    if (position.claimed) {
      return (
        <Badge variant="outline" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Claimed
        </Badge>
      );
    }

    if (isWinner) {
      return (
        <Badge className="gap-1 bg-up text-up-foreground">
          <Gift className="h-3 w-3" />
          Winner
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="text-muted-foreground">
        No Win
      </Badge>
    );
  };

  if (!hasUpBet && !hasDownBet) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">Your Position</CardTitle>
          {getResultBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {hasUpBet && (
            <div className="space-y-1 rounded-md border border-up/30 bg-up/5 p-3">
              <div className="flex items-center gap-2 text-up">
                <TrendingUp className="h-4 w-4" />
                <span className="font-semibold">UP</span>
              </div>
              <p className="font-mono text-lg font-bold">
                {lamportsToSol(position.upNet).toFixed(4)} SOL
              </p>
              {market.status === "Open" && (
                <p className="text-xs text-muted-foreground">
                  Potential: {lamportsToSol(upPayout).toFixed(4)} SOL
                </p>
              )}
            </div>
          )}

          {hasDownBet && (
            <div className="space-y-1 rounded-md border border-down/30 bg-down/5 p-3">
              <div className="flex items-center gap-2 text-down">
                <TrendingDown className="h-4 w-4" />
                <span className="font-semibold">DOWN</span>
              </div>
              <p className="font-mono text-lg font-bold">
                {lamportsToSol(position.downNet).toFixed(4)} SOL
              </p>
              {market.status === "Open" && (
                <p className="text-xs text-muted-foreground">
                  Potential: {lamportsToSol(downPayout).toFixed(4)} SOL
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between border-t pt-3">
          <span className="text-muted-foreground">Total at risk</span>
          <span className="font-mono font-semibold">
            {lamportsToSol(totalBet).toFixed(4)} SOL
          </span>
        </div>

        {market.status === "Resolved" && payout > 0 && (
          <div className="flex justify-between text-lg font-bold">
            <span className={position.claimed ? "text-muted-foreground" : "text-up"}>
              {position.claimed ? "Claimed" : "Claimable"}
            </span>
            <span className={`font-mono ${position.claimed ? "text-muted-foreground" : "text-up"}`}>
              {lamportsToSol(payout).toFixed(4)} SOL
            </span>
          </div>
        )}

        {canClaim && (
          <Button
            className="w-full bg-up hover:bg-up/90 text-white"
            size="lg"
            onClick={onClaim}
            disabled={isPending}
            data-testid="button-claim"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Claiming...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Claim {lamportsToSol(payout).toFixed(4)} SOL
              </span>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
