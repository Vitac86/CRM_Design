import type { Client, ClientAccount, ClientContract, ContractProductType } from '../../../data/types';
import { formatAccountStatus, formatClientType, formatContractKind, formatResidency } from '../../../utils/labels';

export type ClientJournalRow = {
  id: string;
  clientCode: string;
  contractKind: string;
  clientName: string;
  inn: string;
  clientType: string;
  contractNumber: string;
  contractDate: string;
  residencyStatus: string;
  accountType: 'обычный' | 'ИИС' | 'ИН';
  accountStatus: string;
};

export const formatDate = (value: string): string => {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}`;
};

export const mapAccountType = (type: ContractProductType): 'обычный' | 'ИИС' | 'ИН' => {
  if (type === 'iis') {
    return 'ИИС';
  }

  if (type === 'other') {
    return 'ИН';
  }

  return 'обычный';
};

export const getAccountStatus = (contract: ClientContract): string => formatAccountStatus(contract.status);

export const buildClientJournalRows = (
  clients: Client[],
  contracts: ClientContract[],
  accounts: ClientAccount[],
): ClientJournalRow[] => {
  const activeClients = clients.filter((client) => !client.isArchived);

  return activeClients.flatMap((client) => {
    const clientScopedContracts = contracts.filter((contract) => contract.clientId === client.id);

    return clientScopedContracts.map((contract) => {
      const matchedAccount =
        accounts.find(
          (account) => account.clientId === client.id && account.type === contract.type && account.openDate === contract.openDate,
        ) ?? accounts.find((account) => account.clientId === client.id && account.type === contract.type);

      return {
        id: `${client.id}-${contract.id}`,
        clientCode: client.code,
        contractKind: formatContractKind(contract.type),
        clientName: client.name,
        inn: client.inn,
        clientType: formatClientType(client.type),
        contractNumber: contract.number,
        contractDate: formatDate(contract.openDate),
        residencyStatus: formatResidency(client.residency),
        accountType: matchedAccount ? mapAccountType(matchedAccount.type) : mapAccountType(contract.type),
        accountStatus: getAccountStatus(contract),
      };
    });
  });
};
