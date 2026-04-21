export type ClientContract = {
  id: string;
  clientId: string;
  number: string;
  signedAt: string;
  contractType: 'Депозитарный' | 'Договор ДУ' | 'Договор БО' | 'Дилерский' | 'Брокерский';
  status: 'Действующий' | 'Не действующий' | 'Закрытый' | 'На подписании';
};

export const clientContracts: ClientContract[] = [
  { id: 'ctr-1', clientId: 'c-001', number: 'ДУ-2026/001', signedAt: '2026-01-18', contractType: 'Договор ДУ', status: 'Действующий' },
  { id: 'ctr-2', clientId: 'c-001', number: 'ДЕП-2025/311', signedAt: '2025-11-04', contractType: 'Депозитарный', status: 'Действующий' },
  { id: 'ctr-3', clientId: 'c-003', number: 'БО-2026/074', signedAt: '2026-03-22', contractType: 'Договор БО', status: 'На подписании' },
  { id: 'ctr-4', clientId: 'c-004', number: 'ДИЛ-2025/219', signedAt: '2025-08-16', contractType: 'Дилерский', status: 'Не действующий' },
  { id: 'ctr-5', clientId: 'c-005', number: 'БРК-2024/803', signedAt: '2024-12-29', contractType: 'Брокерский', status: 'Закрытый' },
  { id: 'ctr-6', clientId: 'c-006', number: 'ДУ-2026/096', signedAt: '2026-04-02', contractType: 'Договор ДУ', status: 'Действующий' },
];

export const getContractsByClientId = (clientId: string) =>
  clientContracts.filter((contract) => contract.clientId === clientId);
