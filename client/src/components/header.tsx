import { TrendingUp, Wallet, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./theme-toggle";
import { lamportsToSol } from "@shared/schema";

interface HeaderProps {
  walletConnected: boolean;
  walletAddress?: string;
  treasuryBalance?: number;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
}

export function Header({
  walletConnected,
  walletAddress,
  treasuryBalance = 0,
  onConnectWallet,
  onDisconnectWallet,
}: HeaderProps) {
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-lg leading-tight">SOL15</span>
                <span className="text-xs text-muted-foreground leading-tight">Prediction Markets</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
              <Activity className="h-3 w-3 text-status-online" />
              <span className="text-xs font-medium">Devnet</span>
            </Badge>

            {treasuryBalance > 0 && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50">
                <span className="text-xs text-muted-foreground">Treasury:</span>
                <span className="text-sm font-mono font-medium">
                  {lamportsToSol(treasuryBalance).toFixed(2)} SOL
                </span>
              </div>
            )}

            {walletConnected && walletAddress ? (
              <Button
                variant="outline"
                size="default"
                onClick={onDisconnectWallet}
                className="gap-2"
                data-testid="button-disconnect-wallet"
              >
                <Wallet className="h-4 w-4" />
                <span className="font-mono text-sm">{truncateAddress(walletAddress)}</span>
              </Button>
            ) : (
              <Button
                variant="default"
                size="default"
                onClick={onConnectWallet}
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
