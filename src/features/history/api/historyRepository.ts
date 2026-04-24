import type { ClientHistoryEvent } from '../../../data/types';

export interface HistoryRepository {
  listHistoryByClientId(clientId: string): Promise<ClientHistoryEvent[]>;
}
