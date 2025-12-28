import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, ExternalLink, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CountdownTimer } from "@/components/countdown-timer";
import { PriceDisplay } from "@/components/price-display";
import { PoolDistribution } from "@/components/pool-distribution";
import { StatusBadge } from "@/components/status-badge";
import { BettingPanel } from "@/components/betting-panel";
import { PositionDisplay } from "@/components/position-display";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { solanaClient } from "@/lib/solana-client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  type Market,
  type Position,
  type BetSideType,
} from "@shared/schema";

interface MarketWithPosition extends Market {
  position?: Position;
}

export default function MarketDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { connected, publicKey, wallet } = useWallet();
  const { setVisible } = useWalletModal();

  const {
    data: market,
    isLoading,
    refetch,
  } = useQuery<MarketWithPosition>({
    queryKey: ["/api/markets", id],
    refetchInterval: 5000,
  });

  const placeBetMutation = useMutation({
    mutationFn: async ({ side, grossLamports }: { side: BetSideType; grossLamports: number }) => {
      if (!connected || !wallet?.adapter) {
        throw new Error("Please connect your wallet first");
      }

      const result = await solanaClient.placeBet(
        wallet.adapter,
        id!,
        side,
        grossLamports
      );
      
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Bet Placed",
        description: `Transaction confirmed: ${data.signature.slice(0, 8)}...`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/markets", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Place Bet",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!connected || !wallet?.adapter) {
        throw new Error("Please connect your wallet first");
      }

      const result = await solanaClient.claim(
        wallet.adapter,
        id!
      );
      
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Claim Successful",
        description: `Your winnings have been claimed. TX: ${data.signature.slice(0, 8)}...`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/markets", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Claim",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handlePlaceBet = async (side: BetSideType, grossLamports: number) => {
    if (!connected) {
      setVisible(true);
      return;
    }
    await placeBetMutation.mutateAsync({ side, grossLamports });
  };

  const handleClaim = async () => {
    if (!connected) {
      setVisible(true);
      return;
    }
    await claimMutation.mutateAsync();
  };

  const handleConnectWallet = () => {
    setVisible(true);
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts * 1000);
    return date.toLocaleString("es-ES", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Europe/Madrid",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Market Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The market you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Markets
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOpen = market.status === "Open";
  const isResolved = market.status === "Resolved";
  const poolTotal = market.totalUp + market.totalDown;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link href="/">
            <Button variant="ghost" className="gap-2" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
              Back to Markets
            </Button>
          </Link>
          
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.open(`https://explorer.solana.com/address/${market.publicKey}?cluster=devnet`, "_blank")}
            data-testid="button-explorer"
          >
            <ExternalLink className="h-4 w-4" />
            Explorer
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <CardTitle className="text-2xl">SOL/USD Market</CardTitle>
                <p className="text-sm text-muted-foreground font-mono">
                  {formatTimestamp(market.startTs)} - {formatTimestamp(market.endTs)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge
                  status={market.status}
                  result={market.result !== "Unset" ? market.result : undefined}
                />
                {isOpen && <CountdownTimer endTs={market.endTs} onExpire={() => refetch()} />}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <PriceDisplay
                  price={market.startPrice}
                  expo={market.startExpo}
                  label="Start Price"
                  size="lg"
                />
              </div>
              <div className="space-y-2">
                {isResolved && market.endPrice !== null && market.endExpo !== null ? (
                  <PriceDisplay
                    price={market.endPrice}
                    expo={market.endExpo}
                    label="End Price"
                    size="lg"
                    showChange
                    previousPrice={market.startPrice}
                    previousExpo={market.startExpo}
                  />
                ) : (
                  <div>
                    <span className="text-sm text-muted-foreground font-medium">End Price</span>
                    <p className="font-mono text-4xl font-bold text-muted-foreground">--</p>
                  </div>
                )}
              </div>
            </div>

            <PoolDistribution totalUp={market.totalUp} totalDown={market.totalDown} />

            <div className="grid gap-4 sm:grid-cols-3 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Total Pool</p>
                <p className="font-mono text-xl font-bold">
                  {(poolTotal / 1_000_000_000).toFixed(2)} SOL
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">UP Pool</p>
                <p className="font-mono text-xl font-bold text-up">
                  {(market.totalUp / 1_000_000_000).toFixed(2)} SOL
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">DOWN Pool</p>
                <p className="font-mono text-xl font-bold text-down">
                  {(market.totalDown / 1_000_000_000).toFixed(2)} SOL
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isOpen && !connected && (
          <Card className="border-dashed border-2">
            <CardContent className="py-8 text-center">
              <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Connect Wallet to Bet</h3>
              <p className="text-muted-foreground mb-4">
                Connect your Solana wallet to place bets on this market.
              </p>
              <Button onClick={handleConnectWallet} className="gap-2" data-testid="button-connect-to-bet">
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </Button>
            </CardContent>
          </Card>
        )}

        {isOpen && connected && (
          <div className="grid gap-6 md:grid-cols-2">
            <BettingPanel
              side="Up"
              totalPool={market.totalUp}
              onPlaceBet={handlePlaceBet}
              isPending={placeBetMutation.isPending}
            />
            <BettingPanel
              side="Down"
              totalPool={market.totalDown}
              onPlaceBet={handlePlaceBet}
              isPending={placeBetMutation.isPending}
            />
          </div>
        )}

        {market.position && (
          <PositionDisplay
            position={market.position}
            market={market}
            onClaim={handleClaim}
            isPending={claimMutation.isPending}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Market Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Duration:</strong> Each market runs for exactly 15 minutes.
            </p>
            <p>
              <strong className="text-foreground">Fee:</strong> 1% fee is charged upfront when placing a bet.
            </p>
            <p>
              <strong className="text-foreground">UP Wins:</strong> If the end price is higher than the start price.
            </p>
            <p>
              <strong className="text-foreground">DOWN Wins:</strong> If the end price is lower than the start price.
            </p>
            <p>
              <strong className="text-foreground">Push:</strong> If end price equals start price, all bettors receive their net bet back (fee not refunded).
            </p>
            <p>
              <strong className="text-foreground">Payout:</strong> Winners share the entire pool proportionally based on their bet size.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
