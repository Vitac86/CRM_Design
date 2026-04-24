import { clientRelations as seedClientRelations } from '../../../data/clientRelations';
import type { ClientRelation } from '../../../data/types';
import type { RelationsRepository } from '../api/relationsRepository';

const cloneRelation = (relation: ClientRelation): ClientRelation => structuredClone(relation);

export const createMockRelationsRepository = (): RelationsRepository => {
  const relationsStore = seedClientRelations.map(cloneRelation);

  return {
    async listRelationsByClientId(clientId: string) {
      return relationsStore.filter((relation) => relation.clientId === clientId).map(cloneRelation);
    },
  };
};
