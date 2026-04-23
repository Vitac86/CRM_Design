export type BrokerageContractStatus = 'Активен' | 'Приостановлен' | 'Закрыт';

export type BrokerageContract = {
  id: string;
  clientId: string;
  contractNumber: string;
  clientCode: string;
  clientName: string;
  manager: string;
  openedAt: string;
  status: BrokerageContractStatus;
};

export const brokerageContracts: BrokerageContract[] = [
  {
    id: 'br-001',
    clientId: 'c-001',
    contractNumber: 'БР-2026/0012',
    clientCode: 'CL-10241',
    clientName: 'ООО «Альянс Инвест»',
    manager: 'Смирнов И. А.',
    openedAt: '14.01.2026',
    status: 'Активен',
  },
  {
    id: 'br-002',
    clientId: 'c-002',
    contractNumber: 'БР-2026/0044',
    clientCode: 'CL-10873',
    clientName: 'Петрова Анна Сергеевна',
    manager: 'Волкова О. Н.',
    openedAt: '03.02.2026',
    status: 'Приостановлен',
  },
  {
    id: 'br-003',
    clientId: 'c-003',
    contractNumber: 'БР-2025/1988',
    clientCode: 'CL-09452',
    clientName: 'ЗАО «Прима Капитал»',
    manager: 'Ким Е. Р.',
    openedAt: '22.11.2025',
    status: 'Активен',
  },
  {
    id: 'br-004',
    clientId: 'c-004',
    contractNumber: 'БР-2024/1210',
    clientCode: 'CL-08310',
    clientName: 'ИП Орлов Дмитрий Петрович',
    manager: 'Смирнов И. А.',
    openedAt: '09.06.2024',
    status: 'Приостановлен',
  },
  {
    id: 'br-005',
    clientId: 'c-005',
    contractNumber: 'БР-2023/0771',
    clientCode: 'CL-07145',
    clientName: 'ООО «Северный портфель»',
    manager: 'Волкова О. Н.',
    openedAt: '17.03.2023',
    status: 'Закрыт',
  },
];
