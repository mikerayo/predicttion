import { useState } from "react";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { calculateFee, solToLamports, lamportsToSol, type BetSideType } from "@shared/schema";

interface BettingPanelProps {
  side: BetSideType;
  totalPool: number;
  disabled?: boolean;
  minBetSol?: number;
  feeBps?: number;
  onPlaceBet: (side: BetSideType, grossLamports: number) => Promise<void>;
  isPending?: boolean;
}

export function BettingPanel({
  side,
  totalPool,
  disabled = false,
  minBetSol = 0.01,
  feeBps = 100,
  onPlaceBet,
  isPending = false,
}: BettingPanelProps) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isUp = side === "Up";
  const Icon = isUp ? TrendingUp : TrendingDown;

  const parsedAmount = parseFloat(amount) || 0;
  const grossLamports = solToLamports(parsedAmount);
  const { fee, net } = calculateFee(grossLamports, feeBps);

  const validateAmount = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      setError("Enter a valid amount");
      return false;
    }
    if (num < minBetSol) {
      setError(`Minimum bet is ${minBetSol} SOL`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    if (value) {
      validateAmount(value);
    } else {
      setError(null);
    }
  };

  const handlePlaceBet = async () => {
    if (!validateAmount(amount)) return;
    if (disabled) return;

    try {
      await onPlaceBet(side, grossLamports);
      setAmount("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place bet");
    }
  };

  const handleQuickAmount = (sol: number) => {
    setAmount(sol.toString());
    validateAmount(sol.toString());
  };

  return (
    <Card className={`border ${isUp ? "border-up/30 hover:border-up/50" : "border-down/30 hover:border-down/50"} transition-colors`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-md ${isUp ? "bg-up/20 glow-up" : "bg-down/20 glow-down"}`}>
              <Icon className={`h-5 w-5 ${isUp ? "text-up" : "text-down"}`} />
            </div>
            <span className={`text-xl font-bold font-mono ${isUp ? "text-up" : "text-down"}`}>
              {side.toUpperCase()}
            </span>
          </div>
          <div className="text-right">
            <p className="terminal-label">Pool</p>
            <p className="font-mono font-bold text-lg">
              {lamportsToSol(totalPool).toFixed(2)} SOL
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`bet-${side}`} className="terminal-label">
            Bet Amount (SOL)
          </Label>
          <Input
            id={`bet-${side}`}
            type="number"
            step="0.01"
            min={minBetSol}
            placeholder={`Min ${minBetSol} SOL`}
            value={amount}
            onChange={handleAmountChange}
            disabled={disabled || isPending}
            className="font-mono bg-black/50 border-primary/30 focus:border-primary"
            data-testid={`input-bet-${side.toLowerCase()}`}
          />
          
          <div className="flex gap-2">
            {[0.1, 0.5, 1].map((sol) => (
              <Button
                key={sol}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(sol)}
                disabled={disabled || isPending}
                className="flex-1 text-xs font-mono border-primary/20 hover:border-primary/40"
                data-testid={`button-quick-${sol}`}
              >
                {sol} SOL
              </Button>
            ))}
          </div>
        </div>

        {parsedAmount > 0 && (
          <div className="space-y-1 rounded-md bg-black/50 border border-primary/20 p-3 text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">GROSS</span>
              <span>{parsedAmount.toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>FEE (1%)</span>
              <span className="text-down">-{lamportsToSol(fee).toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between font-bold border-t border-primary/20 pt-1 mt-1">
              <span className="text-info">NET BET</span>
              <span className="text-info">{lamportsToSol(net).toFixed(4)} SOL</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-down font-mono">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <Button
          className={`w-full ${isUp ? "bg-up/20 border-up/50 text-up hover:bg-up/30" : "bg-down/20 border-down/50 text-down hover:bg-down/30"} border font-bold`}
          size="lg"
          onClick={handlePlaceBet}
          disabled={disabled || isPending || !amount || !!error}
          data-testid={`button-bet-${side.toLowerCase()}`}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              PLACING BET...
            </span>
          ) : (
            <span className="flex items-center gap-2 font-mono">
              <Icon className="h-5 w-5" />
              BET {side.toUpperCase()}
            </span>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground font-mono">
          MIN: {minBetSol} SOL | FEE: 1%
        </p>
      </CardContent>
    </Card>
  );
}
