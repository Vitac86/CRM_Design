import { tradingProfiles as seedTradingProfiles } from '../../../data/trading';
import type { TradingProfile } from '../../../data/types';
import type { TradingRepository } from '../api/tradingRepository';

const cloneTradingProfile = (profile: TradingProfile): TradingProfile => structuredClone(profile);

export const createMockTradingRepository = (): TradingRepository => {
  const tradingStore = seedTradingProfiles.map(cloneTradingProfile);

  return {
    async listTradingItems() {
      return tradingStore.map(cloneTradingProfile);
    },
    async getTradingItemById(clientId: string) {
      const profile = tradingStore.find((item) => item.clientId === clientId);
      return profile ? cloneTradingProfile(profile) : null;
    },
  };
};
