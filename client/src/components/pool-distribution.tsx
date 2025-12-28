import { lamportsToSol } from "@shared/schema";

interface PoolDistributionProps {
  totalUp: number;
  totalDown: number;
  showLabels?: boolean;
}

export function PoolDistribution({ totalUp, totalDown, showLabels = true }: PoolDistributionProps) {
  const total = totalUp + totalDown;
  const upPercentage = total > 0 ? (totalUp / total) * 100 : 50;
  const downPercentage = total > 0 ? (totalDown / total) * 100 : 50;

  return (
    <div className="w-full space-y-2">
      {showLabels && (
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-up font-semibold">UP</span>
            <span className="font-mono text-muted-foreground">
              {lamportsToSol(totalUp).toFixed(2)} SOL
            </span>
            <span className="text-xs text-muted-foreground">
              ({upPercentage.toFixed(1)}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              ({downPercentage.toFixed(1)}%)
            </span>
            <span className="font-mono text-muted-foreground">
              {lamportsToSol(totalDown).toFixed(2)} SOL
            </span>
            <span className="text-down font-semibold">DOWN</span>
          </div>
        </div>
      )}
      
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        {total > 0 ? (
          <>
            <div
              className="absolute left-0 top-0 h-full bg-up transition-all duration-500"
              style={{ width: `${upPercentage}%` }}
              data-testid="bar-up-pool"
            />
            <div
              className="absolute right-0 top-0 h-full bg-down transition-all duration-500"
              style={{ width: `${downPercentage}%` }}
              data-testid="bar-down-pool"
            />
          </>
        ) : (
          <div className="absolute inset-0 flex">
            <div className="w-1/2 h-full bg-up/30" />
            <div className="w-1/2 h-full bg-down/30" />
          </div>
        )}
      </div>

      {total === 0 && (
        <p className="text-xs text-center text-muted-foreground">
          No bets placed yet
        </p>
      )}
    </div>
  );
}
