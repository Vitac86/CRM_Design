import { clientDocuments as seedClientDocuments } from '../../../data/clientDocuments';
import type { ClientDocument } from '../../../data/types';
import type { DocumentsRepository } from '../api/documentsRepository';

const cloneDocument = (document: ClientDocument): ClientDocument => structuredClone(document);

export const createMockDocumentsRepository = (): DocumentsRepository => {
  const documentsStore = seedClientDocuments.map(cloneDocument);

  return {
    async listDocumentsByClientId(clientId: string) {
      return documentsStore.filter((document) => document.clientId === clientId).map(cloneDocument);
    },
  };
};
