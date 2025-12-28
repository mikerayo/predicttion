import { useQuery } from "@tanstack/react-query";
import { solanaClient } from "@/lib/solana-client";
import { type Market } from "@shared/schema";
import { bufferToFeedId } from "@shared/anchor-idl";

function convertStatusFromChain(status: any): Market["status"] {
  if (status.open !== undefined) return "Open";
  if (status.closed !== undefined) return "Closed";
  if (status.resolved !== undefined) return "Resolved";
  if (status.cancelled !== undefined) return "Cancelled";
  return "Open";
}

function convertResultFromChain(result: any): Market["result"] {
  if (result.up !== undefined) return "Up";
  if (result.down !== undefined) return "Down";
  if (result.push !== undefined) return "Push";
  return "Unset";
}

function convertChainMarketToMarket(chainMarket: any): Market {
  return {
    publicKey: chainMarket.publicKey,
    feedId: typeof chainMarket.feedId === "string" 
      ? chainMarket.feedId 
      : bufferToFeedId(chainMarket.feedId),
    startTs: typeof chainMarket.startTs === "number" 
      ? chainMarket.startTs 
      : Number(chainMarket.startTs),
    endTs: typeof chainMarket.endTs === "number" 
      ? chainMarket.endTs 
      : Number(chainMarket.endTs),
    startPrice: typeof chainMarket.startPrice === "number" 
      ? chainMarket.startPrice 
      : Number(chainMarket.startPrice),
    startExpo: chainMarket.startExpo,
    endPrice: chainMarket.endPrice !== null 
      ? (typeof chainMarket.endPrice === "number" 
          ? chainMarket.endPrice 
          : Number(chainMarket.endPrice))
      : null,
    endExpo: chainMarket.endExpo ?? null,
    totalUp: typeof chainMarket.totalUp === "number" 
      ? chainMarket.totalUp 
      : Number(chainMarket.totalUp),
    totalDown: typeof chainMarket.totalDown === "number" 
      ? chainMarket.totalDown 
      : Number(chainMarket.totalDown),
    status: typeof chainMarket.status === "string" 
      ? chainMarket.status 
      : convertStatusFromChain(chainMarket.status),
    result: typeof chainMarket.result === "string" 
      ? chainMarket.result 
      : convertResultFromChain(chainMarket.result),
    vaultBump: chainMarket.vaultBump ?? 0,
    bump: chainMarket.bump ?? 0,
  };
}

export function useBlockchainMarkets(enabled = true) {
  return useQuery<Market[]>({
    queryKey: ["blockchain-markets"],
    queryFn: async () => {
      const chainMarkets = await solanaClient.getAllMarkets();
      return chainMarkets.map(convertChainMarketToMarket);
    },
    enabled,
    refetchInterval: 10000,
    staleTime: 5000,
  });
}

export function useBlockchainMarket(publicKey: string, enabled = true) {
  return useQuery<Market | null>({
    queryKey: ["blockchain-market", publicKey],
    queryFn: async () => {
      const chainMarket = await solanaClient.fetchMarketFromChain(publicKey);
      if (!chainMarket) return null;
      return convertChainMarketToMarket({
        publicKey,
        ...chainMarket,
      });
    },
    enabled,
    refetchInterval: 5000,
    staleTime: 2000,
  });
}

export function useMarkets(useBlockchain = false) {
  const backendQuery = useQuery<Market[]>({
    queryKey: ["/api/markets"],
    refetchInterval: 10000,
    enabled: !useBlockchain,
  });

  const blockchainQuery = useBlockchainMarkets(useBlockchain);

  if (useBlockchain) {
    return {
      data: blockchainQuery.data ?? [],
      isLoading: blockchainQuery.isLoading,
      error: blockchainQuery.error,
      refetch: blockchainQuery.refetch,
      isBlockchain: true,
    };
  }

  return {
    data: backendQuery.data ?? [],
    isLoading: backendQuery.isLoading,
    error: backendQuery.error,
    refetch: backendQuery.refetch,
    isBlockchain: false,
  };
}
