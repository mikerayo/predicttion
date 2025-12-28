import { TrendingUp, Wallet, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

interface PythPrice {
  feedId: string;
  price: number;
  priceInt: number;
  expo: number;
  conf: number;
  publishTime: number;
  emaPrice: number;
}

export function Header() {
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  const { data: pythPrice, isLoading: isPriceLoading } = useQuery<PythPrice>({
    queryKey: ["/api/prices/current"],
    refetchInterval: 3000,
  });

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const handleConnect = () => {
    setVisible(true);
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  const priceChange = pythPrice ? pythPrice.price - pythPrice.emaPrice : 0;
  const isPositive = priceChange >= 0;

  return (
    <header className="sticky top-0 z-50 border-b border-primary/20 bg-black/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary glow-primary">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-lg leading-tight tracking-tight">SOL15</span>
                <span className="text-xs text-muted-foreground leading-tight font-mono uppercase tracking-wider">Prediction Markets</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-card border border-primary/20">
              <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">SOL/USD</span>
              {isPriceLoading ? (
                <span className="text-sm font-mono font-medium animate-pulse text-info">...</span>
              ) : pythPrice ? (
                <div className="flex items-center gap-1.5" data-testid="text-live-price">
                  <span className="text-sm font-mono font-bold text-foreground">
                    ${pythPrice.price.toFixed(2)}
                  </span>
                  <div className={`flex items-center ${isPositive ? "text-up" : "text-down"}`}>
                    {isPositive ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-sm font-mono text-muted-foreground">--</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5 border-info/30 bg-info/5">
              <Activity className="h-3 w-3 text-info" />
              <span className="text-xs font-mono uppercase tracking-wider text-info">Devnet</span>
            </Badge>

            {connected && publicKey ? (
              <Button
                variant="outline"
                size="default"
                onClick={handleDisconnect}
                className="gap-2 border-primary/30 bg-primary/10"
                data-testid="button-disconnect-wallet"
              >
                <Wallet className="h-4 w-4 text-info" />
                <span className="font-mono text-sm">{truncateAddress(publicKey.toString())}</span>
              </Button>
            ) : (
              <Button
                variant="default"
                size="default"
                onClick={handleConnect}
                className="gap-2 glow-primary"
                data-testid="button-connect-wallet"
              >
                <Wallet className="h-4 w-4" />
                <span className="font-medium">Connect Wallet</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
