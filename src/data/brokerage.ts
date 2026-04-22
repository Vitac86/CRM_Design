export type BrokerageContractStatus = 'Активен' | 'На подписании' | 'Приостановлен' | 'Закрыт';

export type BrokerageContract = {
  id: string;
  contractNumber: string;
  accountNumber: string;
  clientName: string;
  manager: string;
  openedAt: string;
  turnover: string;
  status: BrokerageContractStatus;
};

export const brokerageContracts: BrokerageContract[] = [
  {
    id: 'br-001',
    contractNumber: 'БР-2026/0012',
    accountNumber: '40701-810-2-00012001',
    clientName: 'ООО «Альянс Инвест»',
    manager: 'Смирнов И. А.',
    openedAt: '14.01.2026',
    turnover: '18 240 000 ₽',
    status: 'Активен',
  },
  {
    id: 'br-002',
    contractNumber: 'БР-2026/0044',
    accountNumber: '40701-810-2-00012044',
    clientName: 'Петрова Анна Сергеевна',
    manager: 'Волкова О. Н.',
    openedAt: '03.02.2026',
    turnover: '6 510 000 ₽',
    status: 'На подписании',
  },
  {
    id: 'br-003',
    contractNumber: 'БР-2025/1988',
    accountNumber: '40701-810-2-00009881',
    clientName: 'ЗАО «Прима Капитал»',
    manager: 'Ким Е. Р.',
    openedAt: '22.11.2025',
    turnover: '24 900 000 ₽',
    status: 'Активен',
  },
  {
    id: 'br-004',
    contractNumber: 'БР-2024/1210',
    accountNumber: '40701-810-2-00007121',
    clientName: 'ИП Орлов Дмитрий Петрович',
    manager: 'Смирнов И. А.',
    openedAt: '09.06.2024',
    turnover: '2 980 000 ₽',
    status: 'Приостановлен',
  },
  {
    id: 'br-005',
    contractNumber: 'БР-2023/0771',
    accountNumber: '40701-810-2-00005771',
    clientName: 'ООО «Северный портфель»',
    manager: 'Волкова О. Н.',
    openedAt: '17.03.2023',
    turnover: '1 220 000 ₽',
    status: 'Закрыт',
  },
];
