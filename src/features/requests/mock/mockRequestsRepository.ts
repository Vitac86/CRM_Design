import { NEW_REQUEST_STATUS, requests as seedRequests } from '../../../data/requests';
import type { Request } from '../../../data/types';
import type { CreateRequestInput, RequestsRepository } from '../api/requestsRepository';

const cloneRequest = (request: Request): Request => ({ ...request });

const createRequestId = () => `r-${Date.now()}`;

export const createMockRequestsRepository = (): RequestsRepository => {
  const requestsStore = seedRequests.map(cloneRequest);

  const createRequestNumber = () => {
    const nextIndex = requestsStore.length + 1;
    return `REQ-${String(260000 + nextIndex).padStart(6, '0')}`;
  };

  return {
    async listRequests() {
      return requestsStore.map(cloneRequest);
    },

    async getRequestById(id: string) {
      const request = requestsStore.find((item) => item.id === id);
      return request ? cloneRequest(request) : null;
    },

    async createRequest(input: CreateRequestInput) {
      const request: Request = {
        ...input,
        status: input.status ?? NEW_REQUEST_STATUS,
        id: createRequestId(),
        number: createRequestNumber(),
      };

      requestsStore.unshift(request);
      return cloneRequest(request);
    },
  };
};
