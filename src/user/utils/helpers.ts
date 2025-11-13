import { CoinType } from '../App';

export const getCoinRate = (coin: CoinType): number => {
  const rates: Record<CoinType, number> = {
    BTC: 100000000,
    ETH: 3500000,
    USDT: 1300,
    USDC: 1300,
    BNB: 650000
  };
  return rates[coin];
};
