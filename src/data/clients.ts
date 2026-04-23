import type { BankAccount, Client, ClientRole, ClientType, ComplianceStatus, ResidencyStatus, RiskCategory } from './types';

interface LegacyClient {
  id: string;
  code: string;
  clientCodes?: string[];
  name: string;
  inn: string;
  type: ClientType;
  residency: ResidencyStatus;
  complianceStatus: ComplianceStatus;
  fullDocumentSet: boolean;
  qualification: boolean;
  roles: ClientRole[];
  riskCategory: RiskCategory;
  phone: string;
  email: string;
  address: string;
  representative: string;
  updatedAt: string;
}


const legacyClients: LegacyClient[] = [
  {
    id: 'c-001',
    code: 'INV-1001',
    name: 'ООО «Северный Вектор Капитал»',
    inn: '7701234567',
    type: 'ООО',
    residency: 'Резидент РФ',
    complianceStatus: 'ПРОЙДЕН',
    fullDocumentSet: true,
    qualification: false,
    roles: ['Клиент'],
    riskCategory: 'Средний',
    phone: '+7 (900) 100-11-01',
    email: 'office@svcapital.test',
    address: 'г. Москва, Пресненская наб., д. 8',
    representative: 'Климов Роман Сергеевич',
    updatedAt: '2026-04-20 10:15'
  },
  {
    id: 'c-002',
    code: 'INV-1002',
    name: 'ИП Мельникова Ирина Павловна',
    inn: '500212345678',
    type: 'ИП',
    residency: 'Резидент РФ',
    complianceStatus: 'НА ПРОВЕРКЕ',
    fullDocumentSet: false,
    qualification: false,
    roles: ['Клиент'],
    riskCategory: 'Низкий',
    phone: '+7 (900) 100-11-02',
    email: 'ip.melnikova@testmail.local',
    address: 'г. Тула, ул. Металлистов, д. 14',
    representative: 'Самостоятельно',
    updatedAt: '2026-04-19 16:40'
  },
  {
    id: 'c-003',
    code: 'INV-1003',
    clientCodes: [
      'INV-1003',
      'BR-2025/0003',
      'DEP-2025/0003',
      'TRD-2025/0003',
      'DU-2025/0003',
      'SUB-1003-A1',
      'SUB-1003-A2',
      'SUB-1003-A3',
      'SUB-1003-A4',
      'AML-1003-01',
      'AML-1003-02',
      'KYC-1003-01',
      'KYC-1003-02',
      'RPT-2025-1003-01',
      'RPT-2025-1003-02',
      'RPT-2025-1003-03',
      'OPS-1003-01',
      'OPS-1003-02',
      'OPS-1003-03',
      'DOC-1003-01',
      'DOC-1003-02',
      'DOC-1003-03',
    ],
    name: 'ПАО «НеоЭнергоСбыт»',
    inn: '7813456789',
    type: 'ПАО',
    residency: 'Резидент РФ',
    complianceStatus: 'ПРОЙДЕН',
    fullDocumentSet: true,
    qualification: true,
    roles: ['Клиент', 'Бенефициар'],
    riskCategory: 'Высокий',
    phone: '+7 (900) 100-11-03',
    email: 'corp@neoenergy.test',
    address: 'г. Санкт-Петербург, Невский пр., д. 102',
    representative: 'Васильев Артём Николаевич',
    updatedAt: '2026-04-21 09:05'
  },
  {
    id: 'c-004',
    code: 'INV-1004',
    name: 'ЗАО «Полюс Технологии»',
    inn: '6678123456',
    type: 'ЗАО',
    residency: 'Резидент РФ',
    complianceStatus: 'НА ДОРАБОТКЕ',
    fullDocumentSet: false,
    qualification: false,
    roles: ['Клиент'],
    riskCategory: 'Средний',
    phone: '+7 (900) 100-11-04',
    email: 'docs@polyus-tech.test',
    address: 'г. Екатеринбург, ул. Белинского, д. 30',
    representative: 'Ларина Светлана Вадимовна',
    updatedAt: '2026-04-18 14:30'
  },
  {
    id: 'c-005',
    code: 'INV-1005',
    name: 'АО «Орбита ФинСервис»',
    inn: '5409123456',
    type: 'АО',
    residency: 'Резидент РФ',
    complianceStatus: 'ПРОЙДЕН',
    fullDocumentSet: true,
    qualification: true,
    roles: ['Клиент', 'Бенефициар'],
    riskCategory: 'Повышенный',
    phone: '+7 (900) 100-11-05',
    email: 'support@orbita-fin.test',
    address: 'г. Новосибирск, Красный пр-т, д. 45',
    representative: 'Сафонов Игорь Петрович',
    updatedAt: '2026-04-21 11:12'
  },
  {
    id: 'c-006',
    code: 'INV-1006',
    name: 'Ковалёв Даниил Олегович',
    inn: '772201234567',
    type: 'ФЛ',
    residency: 'Резидент РФ',
    complianceStatus: 'ПРОЙДЕН',
    fullDocumentSet: true,
    qualification: false,
    roles: ['Клиент'],
    riskCategory: 'Средний',
    phone: '+7 (900) 100-11-06',
    email: 'dkovalev@mailbox.fake',
    address: 'г. Москва, ул. Новаторов, д. 17',
    representative: 'Самостоятельно',
    updatedAt: '2026-04-20 18:01'
  },
  {
    id: 'c-007',
    code: 'INV-1007',
    name: 'ООО «Бриз Логистика»',
    inn: '3906234567',
    type: 'ООО',
    residency: 'Резидент РФ',
    complianceStatus: 'ЗАБЛОКИРОВАН',
    fullDocumentSet: true,
    qualification: false,
    roles: ['Клиент'],
    riskCategory: 'Высокий',
    phone: '+7 (900) 100-11-07',
    email: 'ops@breeze-log.test',
    address: 'г. Калининград, ул. Театральная, д. 9',
    representative: 'Титов Алексей Игоревич',
    updatedAt: '2026-04-17 13:09'
  },
  {
    id: 'c-008',
    code: 'INV-1008',
    name: 'ИП Захаров Никита Алексеевич',
    inn: '165312345678',
    type: 'ИП',
    residency: 'Нерезидент',
    complianceStatus: 'НА ПРОВЕРКЕ',
    fullDocumentSet: false,
    qualification: false,
    roles: ['Клиент'],
    riskCategory: 'Повышенный',
    phone: '+7 (900) 100-11-08',
    email: 'zakharov.trade@fakepost.net',
    address: 'г. Казань, ул. Пушкина, д. 12',
    representative: 'Самостоятельно',
    updatedAt: '2026-04-16 12:54'
  },
  {
    id: 'c-009',
    code: 'INV-1009',
    name: 'Громова Алина Сергеевна',
    inn: '501901234567',
    type: 'ФЛ',
    residency: 'Резидент РФ',
    complianceStatus: 'ПРОЙДЕН',
    fullDocumentSet: true,
    qualification: true,
    roles: ['Клиент', 'Бенефициар'],
    riskCategory: 'Высокий',
    phone: '+7 (900) 100-11-09',
    email: 'alinag@private.fake',
    address: 'г. Одинцово, ул. Маршала Жукова, д. 3',
    representative: 'Самостоятельно',
    updatedAt: '2026-04-21 08:33'
  },
  {
    id: 'c-010',
    code: 'INV-1010',
    name: 'ООО «Точка Роста Девелопмент»',
    inn: '6167123456',
    type: 'ООО',
    residency: 'Резидент РФ',
    complianceStatus: 'НА ДОРАБОТКЕ',
    fullDocumentSet: false,
    qualification: false,
    roles: ['Клиент'],
    riskCategory: 'Средний',
    phone: '+7 (900) 100-11-10',
    email: 'dev@tochkarosta.test',
    address: 'г. Ростов-на-Дону, ул. Станиславского, д. 54',
    representative: 'Бойко Максим Викторович',
    updatedAt: '2026-04-15 15:21'
  },
  {
    id: 'c-011',
    code: 'INV-1011',
    name: 'АО «Восток Майнинг Системс»',
    inn: '2721123456',
    type: 'АО',
    residency: 'Резидент РФ',
    complianceStatus: 'НА ПРОВЕРКЕ',
    fullDocumentSet: true,
    qualification: true,
    roles: ['Клиент', 'Бенефициар'],
    riskCategory: 'Высокий',
    phone: '+7 (900) 100-11-11',
    email: 'risk@vostok-mining.test',
    address: 'г. Хабаровск, ул. Муравьёва-Амурского, д. 25',
    representative: 'Рябцев Николай Олегович',
    updatedAt: '2026-04-21 07:55'
  },
  {
    id: 'c-012',
    code: 'INV-1012',
    name: 'ПАО «Сигма Инфраструктура»',
    inn: '6679988776',
    type: 'ПАО',
    residency: 'Резидент РФ',
    complianceStatus: 'ПРОЙДЕН',
    fullDocumentSet: true,
    qualification: true,
    roles: ['Клиент', 'Бенефициар'],
    riskCategory: 'Повышенный',
    phone: '+7 (900) 100-11-12',
    email: 'infra@sigma-pa.test',
    address: 'г. Екатеринбург, ул. Малышева, д. 71',
    representative: 'Кузнецов Илья Романович',
    updatedAt: '2026-04-20 09:12'
  },
  {
    id: 'c-013',
    code: 'INV-1013',
    name: 'Панина Марина Евгеньевна',
    inn: '540401234567',
    type: 'ФЛ',
    residency: 'Нерезидент',
    complianceStatus: 'ЗАБЛОКИРОВАН',
    fullDocumentSet: true,
    qualification: false,
    roles: ['Клиент'],
    riskCategory: 'Высокий',
    phone: '+7 (900) 100-11-13',
    email: 'marina.panina@nomail.fake',
    address: 'г. Новосибирск, ул. Советская, д. 44',
    representative: 'Самостоятельно',
    updatedAt: '2026-04-14 19:10'
  },
  {
    id: 'c-014',
    code: 'INV-1014',
    name: 'ЗАО «Северо-Западный Трейд»',
    inn: '7808123499',
    type: 'ЗАО',
    residency: 'Резидент РФ',
    complianceStatus: 'ПРОЙДЕН',
    fullDocumentSet: true,
    qualification: false,
    roles: ['Клиент'],
    riskCategory: 'Средний',
    phone: '+7 (900) 100-11-14',
    email: 'contact@nw-trade.test',
    address: 'г. Санкт-Петербург, Лиговский пр., д. 150',
    representative: 'Яковлев Пётр Михайлович',
    updatedAt: '2026-04-20 12:27'
  },
  {
    id: 'c-015',
    code: 'INV-1015',
    name: 'ИП Носова Ольга Дмитриевна',
    inn: '370112345678',
    type: 'ИП',
    residency: 'Резидент РФ',
    complianceStatus: 'ПРОЙДЕН',
    fullDocumentSet: true,
    qualification: false,
    roles: ['Клиент'],
    riskCategory: 'Низкий',
    phone: '+7 (900) 100-11-15',
    email: 'olga.nosova@biz.fake',
    address: 'г. Иваново, пр-т Ленина, д. 20',
    representative: 'Самостоятельно',
    updatedAt: '2026-04-19 10:22'
  },
  {
    id: 'c-016',
    code: 'INV-1016',
    name: 'АО «Каспий Порт Актив»',
    inn: '3017123444',
    type: 'АО',
    residency: 'Нерезидент',
    complianceStatus: 'НА ПРОВЕРКЕ',
    fullDocumentSet: false,
    qualification: true,
    roles: ['Клиент', 'Бенефициар'],
    riskCategory: 'Повышенный',
    phone: '+7 (900) 100-11-16',
    email: 'office@caspian-port.test',
    address: 'г. Астрахань, ул. Савушкина, д. 67',
    representative: 'Фадеев Константин Андреевич',
    updatedAt: '2026-04-18 08:44'
  },
  {
    id: 'c-017',
    code: 'INV-1017',
    name: 'Лобанов Тимофей Игоревич',
    inn: '781201234567',
    type: 'ФЛ',
    residency: 'Резидент РФ',
    complianceStatus: 'ПРОЙДЕН',
    fullDocumentSet: true,
    qualification: true,
    roles: ['Клиент', 'Бенефициар'],
    riskCategory: 'Высокий',
    phone: '+7 (900) 100-11-17',
    email: 't.lobanov@demo.fake',
    address: 'г. Санкт-Петербург, ул. Яхтенная, д. 6',
    representative: 'Самостоятельно',
    updatedAt: '2026-04-21 10:28'
  },
  {
    id: 'c-018',
    code: 'INV-1018',
    name: 'ООО «Гранит Партнёрс»',
    inn: '0268099911',
    type: 'ООО',
    residency: 'Резидент РФ',
    complianceStatus: 'ПРОЙДЕН',
    fullDocumentSet: true,
    qualification: false,
    roles: ['Клиент'],
    riskCategory: 'Низкий',
    phone: '+7 (900) 100-11-18',
    email: 'hello@granit-partners.test',
    address: 'г. Уфа, ул. Ленина, д. 88',
    representative: 'Аверин Денис Павлович',
    updatedAt: '2026-04-19 17:09'
  },
  {
    id: 'c-019',
    code: 'INV-1019',
    name: 'Миронова Кира Андреевна',
    inn: '526001234567',
    type: 'ФЛ',
    residency: 'Нерезидент',
    complianceStatus: 'НА ДОРАБОТКЕ',
    fullDocumentSet: false,
    qualification: false,
    roles: ['Клиент'],
    riskCategory: 'Средний',
    phone: '+7 (900) 100-11-19',
    email: 'kira.m@fake.box',
    address: 'г. Нижний Новгород, ул. Ильинская, д. 11',
    representative: 'Самостоятельно',
    updatedAt: '2026-04-18 20:17'
  },
  {
    id: 'c-020',
    code: 'INV-1020',
    name: 'ПАО «Ритм Индустрия»',
    inn: '5903123490',
    type: 'ПАО',
    residency: 'Резидент РФ',
    complianceStatus: 'ПРОЙДЕН',
    fullDocumentSet: true,
    qualification: true,
    roles: ['Клиент', 'Бенефициар'],
    riskCategory: 'Высокий',
    phone: '+7 (900) 100-11-20',
    email: 'invest@ritm-ind.test',
    address: 'г. Пермь, ул. Петропавловская, д. 47',
    representative: 'Зотов Владислав Борисович',
    updatedAt: '2026-04-20 11:38'
  },
  {
    id: 'c-021',
    code: 'INV-1021',
    name: 'ЗАО «Вектор Данных»',
    inn: '1840112233',
    type: 'ЗАО',
    residency: 'Резидент РФ',
    complianceStatus: 'ЗАБЛОКИРОВАН',
    fullDocumentSet: true,
    qualification: false,
    roles: ['Клиент'],
    riskCategory: 'Повышенный',
    phone: '+7 (900) 100-11-21',
    email: 'data@vector-za.test',
    address: 'г. Ижевск, ул. Пушкинская, д. 210',
    representative: 'Терентьев Аркадий Валерьевич',
    updatedAt: '2026-04-17 16:49'
  },
  {
    id: 'c-022',
    code: 'INV-1022',
    name: 'ИП Киселёв Антон Юрьевич',
    inn: '631912345678',
    type: 'ИП',
    residency: 'Резидент РФ',
    complianceStatus: 'ПРОЙДЕН',
    fullDocumentSet: true,
    qualification: true,
    roles: ['Клиент', 'Бенефициар'],
    riskCategory: 'Средний',
    phone: '+7 (900) 100-11-22',
    email: 'anton.k@self.fake',
    address: 'г. Самара, Московское ш., д. 23',
    representative: 'Самостоятельно',
    updatedAt: '2026-04-21 12:01'
  },
  {
    id: 'c-023',
    code: 'INV-1023',
    name: 'АО «Глобал Ресурс Траст»',
    inn: '2465012399',
    type: 'АО',
    residency: 'Резидент РФ',
    complianceStatus: 'НА ПРОВЕРКЕ',
    fullDocumentSet: false,
    qualification: true,
    roles: ['Клиент', 'Бенефициар'],
    riskCategory: 'Высокий',
    phone: '+7 (900) 100-11-23',
    email: 'trust@global-resource.test',
    address: 'г. Красноярск, ул. Мира, д. 91',
    representative: 'Назаров Семён Петрович',
    updatedAt: '2026-04-21 08:05'
  },
  {
    id: 'c-024',
    code: 'INV-1024',
    name: 'Елисеева Яна Витальевна',
    inn: '366401234567',
    type: 'ФЛ',
    residency: 'Резидент РФ',
    complianceStatus: 'ПРОЙДЕН',
    fullDocumentSet: true,
    qualification: false,
    roles: ['Клиент'],
    riskCategory: 'Низкий',
    phone: '+7 (900) 100-11-24',
    email: 'yana.eliseeva@mockmail.fake',
    address: 'г. Воронеж, ул. Кирова, д. 35',
    representative: 'Самостоятельно',
    updatedAt: '2026-04-19 09:03'
  }
];

const splitClientName = (name: string, type: ClientType) => {
  if (type !== 'ФЛ' && type !== 'ИП') {
    return { lastName: name, firstName: '—', middleName: '—' };
  }

  const normalized = name.replace(/^ИП\s+/i, '').trim();
  const [lastName = '—', firstName = '—', middleName = '—'] = normalized.split(/\s+/);

  return { lastName, firstName, middleName };
};

const buildRegistrationAddress = (address: string) => {
  const cityMatch = address.match(/^(г\.\s*[^,]+)/);
  const city = cityMatch?.[1] ?? '—';
  const detail = address.replace(/^(г\.\s*[^,]+,?\s*)/, '').trim();

  return {
    country: 'Россия',
    region: city.replace(/^г\.\s*/, ''),
    district: '—',
    city: city.replace(/^г\.\s*/, ''),
    postalCode: '101000',
    street: detail || '—',
    house: '—',
    building: '—',
    apartment: '—',
  };
};

const buildIndividualDetails = (client: LegacyClient, person: ReturnType<typeof splitClientName>) => ({
  birthPlace: `г. ${person.firstName !== '—' ? 'Москва' : '—'}`,
  snils: `112-233-${client.code.slice(-3)} 9${client.code.slice(-1)}`,
  actualAddressMatches: true,
  services: client.type === 'ИП' ? 'Брокерское обслуживание ИП' : 'Брокерское обслуживание',
  sourceOfFunds: client.type === 'ИП' ? 'Доходы от предпринимательской деятельности' : 'Заработная плата',
  taxResident: client.residency === 'Резидент РФ',
  legalCapacity: 'Полная' as const,
});

const buildLegalEntityDetails = (client: LegacyClient) => ({
  shortName: client.name,
  fullName: `${client.name} (полное наименование)`,
  englishName: client.name.replace(/[«»]/g, '').replace(/\s+/g, ' ').trim(),
  englishFullName: `${client.name.replace(/[«»]/g, '').replace(/\s+/g, ' ').trim()} LLC`,
  parentCompany: '—',
  kpp: `77${client.code.slice(-4)}001`,
  ogrn: `10277${client.code.slice(-6)}1234`,
  registrationDate: '2014-05-18',
  registrationAuthority: 'Межрайонная ИФНС России № 46 по г. Москве',
  authorizedCapital: '10 000 000 ₽',
  registrarName: 'АО «Регистратор Плюс»',
  taxName: 'ИФНС России № 10',
  taxCode: `77${client.code.slice(-2)}`,
  fssNumber: `7734${client.code.slice(-4)}`,
  pfrNumber: `087-10${client.code.slice(-4)}`,
  beneficiary: 'Иванов Иван Иванович',
  authorizedPersons: 'Генеральный директор',
  okato: `45286${client.code.slice(-3)}000`,
  oktmo: `4538${client.code.slice(-4)}`,
  okpo: `58${client.code.slice(-6)}`,
  okfs: '16',
  okogu: '4210014',
});

const defaultManager = {
  name: 'Петрова Анна Сергеевна',
  role: 'Старший клиентский менеджер',
  phone: '+7 (495) 300-00-01',
  email: 'petrova@crm-design.local',
};

const defaultAgent = {
  name: 'Смирнов Алексей Петрович',
  company: 'ООО «ФинКонсалт Групп»',
  code: 'АГ-000001',
  phone: '+7 (495) 555-12-34',
  email: 'smirnov@crm-design.local',
};


const bankAccountsByClientId: Record<string, BankAccount[]> = {
  'c-001': [
    {
      id: 'ba-1',
      bankName: 'АО «ИнвестБанк»',
      bik: '044525000',
      accountNumber: '40702810900000000001',
      correspondentAccount: '30101810400000000225',
      currency: 'RUB',
      purpose: 'Основной расчётный счёт',
      status: 'Активен',
      openedAt: '2025-02-19',
    },
    {
      id: 'ba-2',
      bankName: 'ПАО «Северный Банк»',
      bik: '044525225',
      accountNumber: '40702810900000000002',
      correspondentAccount: '30101810000000000225',
      currency: 'RUB',
      purpose: 'Счёт для брокерских операций',
      status: 'На проверке',
      openedAt: '2025-03-11',
    },
  ],
  'c-003': [
    {
      id: 'ba-3',
      bankName: 'АО «ИнвестБанк»',
      bik: '044525000',
      accountNumber: '40702810900000001301',
      correspondentAccount: '30101810400000000225',
      currency: 'RUB',
      purpose: 'Основной расчётный счёт',
      status: 'Активен',
      openedAt: '2024-11-05',
    },
    {
      id: 'ba-4',
      bankName: 'ПАО «Восточный Капитал»',
      bik: '044525974',
      accountNumber: '40702840900000001302',
      correspondentAccount: '30101810200000000974',
      currency: 'USD',
      purpose: 'Валютный счёт для внешних расчётов',
      status: 'Активен',
      openedAt: '2025-01-14',
    },
    {
      id: 'ba-5',
      bankName: 'АО «Расчётный дом СЗФО»',
      bik: '044030790',
      accountNumber: '40702810900000001303',
      correspondentAccount: '30101810900000000790',
      currency: 'EUR',
      purpose: 'Счёт для расчётов с иностранными контрагентами',
      status: 'На проверке',
      openedAt: '2025-03-22',
    },
    {
      id: 'ba-6',
      bankName: 'ПАО «ПромРесурс Банк»',
      bik: '044525555',
      accountNumber: '40702810900000001304',
      correspondentAccount: '30101810600000000555',
      currency: 'CNY',
      purpose: 'Специальный счёт для импортных контрактов',
      status: 'Закрыт',
      openedAt: '2024-06-30',
    },
  ],
  'c-005': [
    {
      id: 'ba-7',
      bankName: 'АО «Орбита Банк»',
      bik: '045004774',
      accountNumber: '40702810900000000501',
      correspondentAccount: '30101810300000000774',
      currency: 'RUB',
      purpose: 'Операционный счёт',
      status: 'Активен',
      openedAt: '2025-02-03',
    },
  ],
};

const archivedClientMeta: Record<string, { archivedAt: string }> = {
  'c-004': { archivedAt: '2026-04-18' },
  'c-010': { archivedAt: '2026-04-15' },
  'c-019': { archivedAt: '2026-04-18' },
};

export const clients: Client[] = legacyClients.map((client) => {
  const person = splitClientName(client.name, client.type);
  const archiveMeta = archivedClientMeta[client.id];

  return {
    ...client,
    ...person,
    isArchived: Boolean(archiveMeta),
    archivedAt: archiveMeta?.archivedAt,
    birthDate: client.type === 'ФЛ' || client.type === 'ИП' ? '1988-04-12' : '—',
    ogrnip: client.type === 'ИП' ? `ОГРНИП-${client.code.slice(-4)}` : '—',
    secondaryPhone: '+7 (495) 000-00-00',
    canUseMoney: client.qualification,
    canUseSecurities: client.riskCategory !== 'Низкий',
    manager: defaultManager,
    agent: { ...defaultAgent, code: `АГ-${client.code.slice(-4)}` },
    reportDelivery: {
      email: { enabled: true, address: client.email },
      personalAccount: { enabled: client.fullDocumentSet },
    },
    registrationAddress: buildRegistrationAddress(client.address),
    bankDetails: {
      bankName: 'АО «ИнвестБанк»',
      bik: '044525000',
      checkingAccount: `40702810${client.code.slice(-4)}000000001`,
      correspondentAccount: '30101810400000000000',
    },
    bankAccounts: bankAccountsByClientId[client.id],
    individualDetails: client.type === 'ФЛ' || client.type === 'ИП' ? buildIndividualDetails(client, person) : undefined,
    legalEntityDetails: client.type === 'ФЛ' || client.type === 'ИП' ? undefined : buildLegalEntityDetails(client),
  };
});


export const getClientById = (id: string): Client | undefined =>
  clients.find((client) => client.id === id);

export const getClientByCode = (code: string): Client | undefined =>
  clients.find((client) => client.code === code);
