import type { Request } from '../../../data/types';

export type CreateRequestInput = Omit<Request, 'id' | 'number'>;

export interface RequestsRepository {
  listRequests(): Promise<Request[]>;
  getRequestById(id: string): Promise<Request | null>;
  createRequest(input: CreateRequestInput): Promise<Request>;
}
