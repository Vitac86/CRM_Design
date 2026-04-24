import type { ClientRelation } from '../../../data/types';

export interface RelationsRepository {
  listRelationsByClientId(clientId: string): Promise<ClientRelation[]>;
}
