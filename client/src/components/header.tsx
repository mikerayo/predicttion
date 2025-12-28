import { TrendingUp, Wallet, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./theme-toggle";
import { lamportsToSol } from "@shared/schema";
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
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-lg leading-tight">SOL15</span>
                <span className="text-xs text-muted-foreground leading-tight">Prediction Markets</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border">
              <span className="text-xs text-muted-foreground">SOL/USD</span>
              {isPriceLoading ? (
                <span className="text-sm font-mono font-medium animate-pulse">...</span>
              ) : pythPrice ? (
                <div className="flex items-center gap-1.5" data-testid="text-live-price">
                  <span className="text-sm font-mono font-semibold">
                    ${pythPrice.price.toFixed(2)}
                  </span>
                  <div className={`flex items-center ${isPositive ? "text-trade-up" : "text-trade-down"}`}>
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
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
              <Activity className="h-3 w-3 text-status-online" />
              <span className="text-xs font-medium">Devnet</span>
            </Badge>

            {connected && publicKey ? (
              <Button
                variant="outline"
                size="default"
                onClick={handleDisconnect}
                className="gap-2"
                data-testid="button-disconnect-wallet"
              >
                <Wallet className="h-4 w-4" />
                <span className="font-mono text-sm">{truncateAddress(publicKey.toString())}</span>
              </Button>
            ) : (
              <Button
                variant="default"
                size="default"
                onClick={handleConnect}
                className="gap-2"
                data-testid="button-connect-wallet"
              >
                <Wallet className="h-4 w-4" />
                <span>Connect Wallet</span>
              </Button>
            )}

            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
