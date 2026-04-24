import type { TradingProfile } from '../../../data/types';

export interface TradingRepository {
  listTradingItems(): Promise<TradingProfile[]>;
  getTradingItemById(clientId: string): Promise<TradingProfile | null>;
}
