import { clientAccounts as seedAccounts } from '../../../data/clientAccounts';
import type { ClientAccount } from '../../../data/types';
import type { AccountsRepository } from '../api/accountsRepository';

const cloneAccount = (account: ClientAccount): ClientAccount => structuredClone(account);

export const createMockAccountsRepository = (): AccountsRepository => {
  const accountsStore = seedAccounts.map(cloneAccount);
  let nextAccountId = accountsStore.reduce((maxValue, account) => {
    const numericPart = Number(account.id.replace('acc-', ''));
    return Number.isFinite(numericPart) ? Math.max(maxValue, numericPart) : maxValue;
  }, 0) + 1;

  return {
    async listAccounts() {
      return accountsStore.map(cloneAccount);
    },

    async listAccountsByClientId(clientId: string) {
      return accountsStore.filter((account) => account.clientId === clientId).map(cloneAccount);
    },

    async createAccount(payload) {
      const account: ClientAccount = {
        id: `acc-${nextAccountId}`,
        clientId: payload.clientId,
        number: payload.number.trim(),
        type: payload.type,
        openDate: payload.openDate,
      };
      nextAccountId += 1;
      accountsStore.unshift(account);
      return cloneAccount(account);
    },
  };
};
