export type ClientDocument = {
  id: string;
  clientId: string;
  title: string;
  documentType: string;
  status: 'Действующий' | 'Не действующий' | 'На проверке' | 'На подписи' | 'Отклонена';
  date: string;
  fileName: string;
};

export const clientDocuments: ClientDocument[] = [
  { id: 'doc-1', clientId: 'c-001', title: 'Анкета клиента', documentType: 'Анкета', status: 'Действующий', date: '2026-03-14', fileName: 'anketa-c001.docx' },
  { id: 'doc-2', clientId: 'c-001', title: 'Доверенность на представителя', documentType: 'Доверенность', status: 'На проверке', date: '2026-04-08', fileName: 'power-attorney-c001.pdf' },
  { id: 'doc-3', clientId: 'c-002', title: 'Паспорт ИП', documentType: 'Паспорт', status: 'Действующий', date: '2025-10-19', fileName: 'passport-c002.pdf' },
  { id: 'doc-4', clientId: 'c-003', title: 'Договор доверительного управления', documentType: 'Договор ДУ', status: 'На подписи', date: '2026-04-18', fileName: 'du-contract-c003.pdf' },
  { id: 'doc-5', clientId: 'c-003', title: 'Депозитарное соглашение', documentType: 'Депозитарный', status: 'Действующий', date: '2025-12-01', fileName: 'depositary-c003.pdf' },
  { id: 'doc-6', clientId: 'c-004', title: 'Договор брокерского обслуживания', documentType: 'Договор БО', status: 'Отклонена', date: '2026-02-09', fileName: 'brokerage-c004.pdf' },
  { id: 'doc-7', clientId: 'c-005', title: 'Выписка ЕГРЮЛ', documentType: 'Выписка', status: 'Не действующий', date: '2024-05-17', fileName: 'egrul-c005.pdf' },
  { id: 'doc-8', clientId: 'c-006', title: 'Дилерский договор', documentType: 'Дилерский', status: 'Действующий', date: '2026-01-23', fileName: 'dealer-c006.pdf' },
];

export const getDocumentsByClientId = (clientId: string) =>
  clientDocuments.filter((document) => document.clientId === clientId);
