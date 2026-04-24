import type { Client, ClientAccount, ClientContract, ContractProductType } from '../../../data/types';

export type ClientJournalRow = {
  id: string;
  clientCode: string;
  contractKind: 'БО' | 'ДУ';
  clientName: string;
  inn: string;
  clientType: 'ф/л' | 'ю/л';
  contractNumber: string;
  contractDate: string;
  residencyStatus: string;
  accountType: 'обычный' | 'ИИС' | 'ИН';
  accountStatus: 'активный' | 'закрытый';
};

export const formatDate = (value: string): string => {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}`;
};

export const mapContractKind = (contractType: ContractProductType): 'БО' | 'ДУ' =>
  contractType === 'trust' ? 'ДУ' : 'БО';

export const mapClientType = (type: string): 'ф/л' | 'ю/л' => (type === 'ФЛ' || type === 'ИП' ? 'ф/л' : 'ю/л');

export const mapAccountType = (type: ContractProductType): 'обычный' | 'ИИС' | 'ИН' => {
  if (type === 'iis') {
    return 'ИИС';
  }

  if (type === 'other') {
    return 'ИН';
  }

  return 'обычный';
};

export const getAccountStatus = (contract: ClientContract): 'активный' | 'закрытый' =>
  contract.status === 'active' ? 'активный' : 'закрытый';

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
        contractKind: mapContractKind(contract.type),
        clientName: client.name,
        inn: client.inn,
        clientType: mapClientType(client.type),
        contractNumber: contract.number,
        contractDate: formatDate(contract.openDate),
        residencyStatus: client.residency,
        accountType: matchedAccount ? mapAccountType(matchedAccount.type) : mapAccountType(contract.type),
        accountStatus: getAccountStatus(contract),
      };
    });
  });
};
