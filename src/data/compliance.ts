import type {
  ComplianceCase,
  IndividualComplianceCard,
  LegalEntityComplianceCard
} from './types';

export const complianceCases: readonly ComplianceCase[] = [
  {
    id: 'cmp-001',
    clientId: 'c-002',
    reviewReason: 'Неполный комплект KYC-документов',
    pepFlag: false,
    sanctionsFlag: false,
    lastCheckAt: '2026-04-19 11:35',
    nextCheckAt: '2026-05-19 11:35',
    analyst: 'Анна Берестова',
    comment: 'Ожидаем подтверждение адреса регистрации.'
  },
  {
    id: 'cmp-002',
    clientId: 'c-007',
    reviewReason: 'Триггер по повышенному обороту',
    pepFlag: false,
    sanctionsFlag: true,
    lastCheckAt: '2026-04-17 12:10',
    nextCheckAt: '2026-04-24 12:10',
    analyst: 'Павел Миронов',
    comment: 'Запрошены пояснения по контрагентам.'
  },
  {
    id: 'cmp-003',
    clientId: 'c-013',
    reviewReason: 'Проверка нерезидента',
    pepFlag: false,
    sanctionsFlag: false,
    lastCheckAt: '2026-04-14 16:20',
    nextCheckAt: '2026-05-14 16:20',
    analyst: 'Олеся Ким',
    comment: 'Требуется обновление налоговой справки.'
  },
  {
    id: 'cmp-004',
    clientId: 'c-016',
    reviewReason: 'Риск-скоринг выше порога',
    pepFlag: true,
    sanctionsFlag: false,
    lastCheckAt: '2026-04-18 09:00',
    nextCheckAt: '2026-04-25 09:00',
    analyst: 'Николай Тарасов',
    comment: 'Усиленный мониторинг и ручная верификация.'
  },
  {
    id: 'cmp-005',
    clientId: 'c-023',
    reviewReason: 'Проверка структуры бенефициаров',
    pepFlag: false,
    sanctionsFlag: false,
    lastCheckAt: '2026-04-21 08:15',
    nextCheckAt: '2026-05-05 08:15',
    analyst: 'Екатерина Лысенко',
    comment: 'Поступили новые корпоративные документы.'
  }
];

export const legalEntityComplianceCards: readonly LegalEntityComplianceCard[] = [
  {
    clientId: 'c-001',
    ogrn: '1027700123456',
    kpp: '770101001',
    registrationDate: '2018-05-14',
    director: 'Климов Роман Сергеевич',
    beneficiaries: ['Фонд «Вектор-Холдинг» (65%)', 'Смирнов И. А. (35%)'],
    activity: 'Консалтинг в сфере инвестиционных решений',
    riskNote: 'Стандартный профиль риска для корпоративного сегмента.'
  },
  {
    clientId: 'c-007',
    ogrn: '1193900001122',
    kpp: '390601001',
    registrationDate: '2019-09-03',
    director: 'Титов Алексей Игоревич',
    beneficiaries: ['ООО «Балтик Групп» (100%)'],
    activity: 'Транспортно-логистические услуги',
    riskNote: 'Выявлены операции с повышенным комплаенс-риском.'
  },
  {
    clientId: 'c-016',
    ogrn: '1143025002248',
    kpp: '301701001',
    registrationDate: '2014-04-17',
    director: 'Фадеев Константин Андреевич',
    beneficiaries: ['АО «Каспий Холдинг» (72%)', 'Артемьев Д. А. (28%)'],
    activity: 'Портовая инфраструктура и терминальные услуги',
    riskNote: 'Режим усиленного мониторинга операций и контрагентов.'
  },
  {
    clientId: 'c-023',
    ogrn: '1152468009988',
    kpp: '246501001',
    registrationDate: '2015-11-26',
    director: 'Назаров Семён Петрович',
    beneficiaries: ['АО «Сибирь Девелопмент» (51%)', 'Лебедев А. С. (49%)'],
    activity: 'Управление активами и проектное финансирование',
    riskNote: 'Проводится уточнение конечных бенефициаров.'
  }
];

export const individualComplianceCards: readonly IndividualComplianceCard[] = [
  {
    clientId: 'c-002',
    passportMasked: '45** ****66',
    birthDate: '1986-11-02',
    citizenship: 'Россия',
    taxResidenceCountry: 'Россия',
    incomeSource: 'Предпринимательская деятельность',
    riskNote: 'Ожидается подтверждение фактического адреса ведения бизнеса.'
  },
  {
    clientId: 'c-006',
    passportMasked: '45** ****21',
    birthDate: '1991-07-19',
    citizenship: 'Россия',
    taxResidenceCountry: 'Россия',
    incomeSource: 'Заработная плата и инвестиционный доход',
    riskNote: 'Без дополнительных факторов риска.'
  },
  {
    clientId: 'c-013',
    passportMasked: '52** ****04',
    birthDate: '1987-01-28',
    citizenship: 'Россия',
    taxResidenceCountry: 'ОАЭ',
    incomeSource: 'Предпринимательская деятельность',
    riskNote: 'Нерезидент, требуется обновление налогового статуса.'
  },
  {
    clientId: 'c-019',
    passportMasked: '74** ****89',
    birthDate: '1994-03-11',
    citizenship: 'Россия',
    taxResidenceCountry: 'Казахстан',
    incomeSource: 'Доход от оказания услуг',
    riskNote: 'Ожидается подтверждение источника средств.'
  }
];
