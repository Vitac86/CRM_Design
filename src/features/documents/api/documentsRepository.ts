import type { ClientDocument } from '../../../data/types';

export interface DocumentsRepository {
  listDocumentsByClientId(clientId: string): Promise<ClientDocument[]>;
}
