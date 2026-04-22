export type TrustContractStatus = 'Активен' | 'На подписании' | 'Закрыт';

export type TrustContract = {
  id: string;
  contractNumber: string;
  clientName: string;
  strategy: string;
  portfolioValue: string;
  startDate: string;
  status: TrustContractStatus;
};

export const trustContracts: TrustContract[] = [
  {
    id: 'tm-001',
    contractNumber: 'ДУ-2026/010',
    clientName: 'ООО «Каскад Финанс»',
    strategy: 'Сбалансированная',
    portfolioValue: '52 000 000 ₽',
    startDate: '11.01.2026',
    status: 'Активен',
  },
  {
    id: 'tm-002',
    contractNumber: 'ДУ-2026/023',
    clientName: 'Жукова Мария Павловна',
    strategy: 'Консервативная',
    portfolioValue: '8 700 000 ₽',
    startDate: '02.03.2026',
    status: 'На подписании',
  },
  {
    id: 'tm-003',
    contractNumber: 'ДУ-2025/182',
    clientName: 'АО «Стратег Ресурс»',
    strategy: 'Агрессивная',
    portfolioValue: '31 400 000 ₽',
    startDate: '19.09.2025',
    status: 'Активен',
  },
  {
    id: 'tm-004',
    contractNumber: 'ДУ-2024/099',
    clientName: 'ИП Власов Андрей Андреевич',
    strategy: 'Индексная',
    portfolioValue: '4 150 000 ₽',
    startDate: '26.05.2024',
    status: 'Закрыт',
  },
];
