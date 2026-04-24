import { clientHistory as seedClientHistory } from '../../../data/clientHistory';
import type { ClientHistoryEvent } from '../../../data/types';
import type { HistoryRepository } from '../api/historyRepository';

const cloneHistoryEvent = (event: ClientHistoryEvent): ClientHistoryEvent => structuredClone(event);

export const createMockHistoryRepository = (): HistoryRepository => {
  const historyStore = seedClientHistory.map(cloneHistoryEvent);

  return {
    async listHistoryByClientId(clientId: string) {
      return historyStore.filter((event) => event.clientId === clientId).map(cloneHistoryEvent);
    },
  };
};
