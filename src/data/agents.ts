export type AgentStatus = 'Активен' | 'На проверке' | 'Неактивен';

export type Agent = {
  id: string;
  fullName: string;
  company: string;
  agentCode: string;
  phone: string;
  email: string;
  status: AgentStatus;
};

export const agents: Agent[] = [
  {
    id: 'ag-001',
    fullName: 'Куликов Артём Сергеевич',
    company: 'ООО «Бизнес Партнёр»',
    agentCode: 'AG-2041',
    phone: '+7 (495) 234-18-11',
    email: 'kulikov@partner.ru',
    status: 'Активен',
  },
  {
    id: 'ag-002',
    fullName: 'Горбунова Елена Игоревна',
    company: 'АО «Регион Инвест»',
    agentCode: 'AG-1988',
    phone: '+7 (812) 330-21-09',
    email: 'gorbunova@regioninvest.ru',
    status: 'На проверке',
  },
  {
    id: 'ag-003',
    fullName: 'Сысоев Михаил Валентинович',
    company: 'ООО «ФинПроводник»',
    agentCode: 'AG-1760',
    phone: '+7 (343) 379-44-70',
    email: 'sysoev@finprov.ru',
    status: 'Неактивен',
  },
];
