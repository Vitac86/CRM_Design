import { clientDocuments as seedClientDocuments } from '../../../data/clientDocuments';
import { documents as seedDocuments } from '../../../data/documents';
import type { ClientDocument, Document } from '../../../data/types';
import type { DocumentsRepository } from '../api/documentsRepository';

const cloneDocument = (document: ClientDocument): ClientDocument => structuredClone(document);
const clonePageDocument = (document: Document): Document => structuredClone(document);

export const createMockDocumentsRepository = (): DocumentsRepository => {
  const documentsStore = seedClientDocuments.map(cloneDocument);
  const pageDocumentsStore = seedDocuments.map(clonePageDocument);

  return {
    async listDocuments() {
      return pageDocumentsStore.map(clonePageDocument);
    },
    async listDocumentsByClientId(clientId: string) {
      return documentsStore.filter((document) => document.clientId === clientId).map(cloneDocument);
    },
  };
};
