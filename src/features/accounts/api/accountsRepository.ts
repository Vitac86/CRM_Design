import type { ClientAccount, ContractProductType } from '../../../data/types';

export interface AccountsRepository {
  listAccounts(): Promise<ClientAccount[]>;
  listAccountsByClientId(clientId: string): Promise<ClientAccount[]>;
  createAccount(payload: {
    clientId: string;
    number: string;
    type: ContractProductType;
    openDate: string;
  }): Promise<ClientAccount>;
}
