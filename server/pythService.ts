import { HermesClient } from "@pythnetwork/hermes-client";

const SOL_USD_FEED_ID = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
const HERMES_ENDPOINT = "https://hermes.pyth.network";

export interface PythPrice {
  feedId: string;
  price: number;
  priceInt: number;
  expo: number;
  conf: number;
  publishTime: number;
  emaPrice: number;
}

let cachedPrice: PythPrice | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 2000;

const hermesClient = new HermesClient(HERMES_ENDPOINT);

export async function getSolUsdPrice(): Promise<PythPrice> {
  const now = Date.now();
  
  if (cachedPrice && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedPrice;
  }
  
  try {
    const priceUpdates = await hermesClient.getLatestPriceUpdates([SOL_USD_FEED_ID]);
    
    if (!priceUpdates?.parsed || priceUpdates.parsed.length === 0) {
      throw new Error("No price data returned from Pyth");
    }
    
    const priceFeed = priceUpdates.parsed[0];
    const priceData = priceFeed.price;
    
    const priceInt = Number(priceData.price);
    const expo = priceData.expo;
    const price = priceInt * Math.pow(10, expo);
    const conf = Number(priceData.conf) * Math.pow(10, expo);
    
    const emaData = priceFeed.ema_price;
    const emaPrice = Number(emaData.price) * Math.pow(10, emaData.expo);
    
    cachedPrice = {
      feedId: SOL_USD_FEED_ID,
      price,
      priceInt,
      expo,
      conf,
      publishTime: priceFeed.price.publish_time,
      emaPrice,
    };
    
    lastFetchTime = now;
    return cachedPrice;
  } catch (error) {
    console.error("Error fetching Pyth price:", error);
    
    if (cachedPrice) {
      return cachedPrice;
    }
    
    throw new Error("Failed to fetch SOL/USD price from Pyth Oracle");
  }
}

export function getFeedId(): string {
  return SOL_USD_FEED_ID;
}
