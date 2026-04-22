export type ArchiveType = 'Архив' | 'ЧС';

export type ArchiveRecordStatus = 'Обработано' | 'В работе' | 'Требует проверки';

export type ArchiveRecord = {
  id: string;
  object: string;
  type: ArchiveType;
  date: string;
  status: ArchiveRecordStatus;
  owner: string;
};

export const archiveRecords: ArchiveRecord[] = [
  {
    id: 'ar-001',
    object: 'Договор БР-2022/303',
    type: 'Архив',
    date: '21.02.2026',
    status: 'Обработано',
    owner: 'Павлова И. Н.',
  },
  {
    id: 'ar-002',
    object: 'Запись инцидента №CH-55',
    type: 'ЧС',
    date: '03.03.2026',
    status: 'В работе',
    owner: 'Ильин А. Р.',
  },
  {
    id: 'ar-003',
    object: 'Архив клиентских досье Q4',
    type: 'Архив',
    date: '12.12.2025',
    status: 'Требует проверки',
    owner: 'Климова М. С.',
  },
  {
    id: 'ar-004',
    object: 'Пакет сообщений о рисках',
    type: 'ЧС',
    date: '28.01.2026',
    status: 'Обработано',
    owner: 'Ильин А. Р.',
  },
];
