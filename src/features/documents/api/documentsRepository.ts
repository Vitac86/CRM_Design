import type { ClientDocument, Document } from '../../../data/types';

export interface DocumentsRepository {
  listDocuments(): Promise<Document[]>;
  listDocumentsByClientId(clientId: string): Promise<ClientDocument[]>;
}
