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
  const colorClass = isUp ? "up" : "down";
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
    <Card className={`border-2 ${isUp ? "border-up/30" : "border-down/30"}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-md ${isUp ? "bg-up" : "bg-down"}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <span className={`text-xl font-bold ${isUp ? "text-up" : "text-down"}`}>
              {side.toUpperCase()}
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Pool</p>
            <p className="font-mono font-semibold">
              {lamportsToSol(totalPool).toFixed(2)} SOL
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`bet-${side}`} className="text-sm text-muted-foreground">
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
            className="font-mono"
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
                className="flex-1 text-xs font-mono"
                data-testid={`button-quick-${sol}`}
              >
                {sol} SOL
              </Button>
            ))}
          </div>
        </div>

        {parsedAmount > 0 && (
          <div className="space-y-1 rounded-md bg-muted/50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Amount</span>
              <span className="font-mono">{parsedAmount.toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Fee (1%)</span>
              <span className="font-mono">-{lamportsToSol(fee).toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between font-medium border-t border-border pt-1 mt-1">
              <span>Net Bet</span>
              <span className="font-mono">{lamportsToSol(net).toFixed(4)} SOL</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <Button
          className={`w-full ${isUp ? "bg-up hover:bg-up/90" : "bg-down hover:bg-down/90"} text-white`}
          size="lg"
          onClick={handlePlaceBet}
          disabled={disabled || isPending || !amount || !!error}
          data-testid={`button-bet-${side.toLowerCase()}`}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Placing Bet...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              Bet {side.toUpperCase()}
            </span>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Min bet: {minBetSol} SOL | 1% fee charged upfront
        </p>
      </CardContent>
    </Card>
  );
}
