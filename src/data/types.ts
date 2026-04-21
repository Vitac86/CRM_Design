export type ClientType = 'ООО' | 'ИП' | 'ПАО' | 'ЗАО' | 'АО' | 'ФЛ';

export type ResidencyStatus = 'Резидент РФ' | 'Нерезидент';

export type ComplianceStatus =
  | 'ПРОЙДЕН'
  | 'НА ПРОВЕРКЕ'
  | 'КРОМЕ ПРОЙДЕН'
  | 'ТРЕБУЕТ ДОКУМЕНТЫ';

export type RiskCategory = 'Низкий' | 'Средний' | 'Высокий' | 'Повышенный';
export type ClientRole = 'Клиент' | 'Бенефициар' | 'Представитель';

export interface ClientManager {
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface ClientAgent {
  name: string;
  company: string;
  code: string;
  phone: string;
  email: string;
}

export interface ClientReportDelivery {
  email: {
    enabled: boolean;
    address: string;
  };
  personalAccount: {
    enabled: boolean;
  };
}

export interface ClientRegistrationAddress {
  country: string;
  region: string;
  district: string;
  city: string;
  postalCode: string;
  street: string;
  house: string;
  building: string;
  apartment: string;
}

export interface ClientBankDetails {
  bankName: string;
  bik: string;
  checkingAccount: string;
  correspondentAccount: string;
}

export interface Client {
  id: string;
  code: string;
  name: string;
  lastName: string;
  firstName: string;
  middleName: string;
  inn: string;
  ogrnip: string;
  birthDate: string;
  type: ClientType;
  residency: ResidencyStatus;
  complianceStatus: ComplianceStatus;
  fullDocumentSet: boolean;
  qualification: boolean;
  roles: ClientRole[];
  riskCategory: RiskCategory;
  phone: string;
  secondaryPhone: string;
  email: string;
  address: string;
  representative: string;
  updatedAt: string;
  canUseMoney: boolean;
  canUseSecurities: boolean;
  manager: ClientManager;
  agent: ClientAgent;
  reportDelivery: ClientReportDelivery;
  registrationAddress: ClientRegistrationAddress;
  bankDetails: ClientBankDetails;
}

export interface Document {
  id: string;
  clientId: string;
  title: string;
  kind: string;
  status: 'Действующий' | 'Не действующий' | 'Отклонена' | 'На подписи' | 'На проверке';
  date: string;
}

export interface Request {
  id: string;
  clientId: string;
  number: string;
  requestType: string;
  status: 'Новая' | 'В работе' | 'Исполнена' | 'Отклонена';
  date: string;
  source: 'CRM' | 'Email' | 'Телефон' | 'Личный кабинет';
}

export interface Report {
  id: string;
  department: 'Мидл-офис' | 'Бэк-офис' | 'Депозитарий';
  fileName: string;
  sentAt: string;
  reportType: string;
  deliveryChannel: 'СБИС' | 'Диадок' | 'Email' | 'FTP';
  deliveryResult: 'Доставлен' | 'Ошибка' | 'Ожидает подтверждения';
}

export interface ComplianceCase {
  id: string;
  clientId: string;
  reviewReason: string;
  pepFlag: boolean;
  sanctionsFlag: boolean;
  lastCheckAt: string;
  nextCheckAt: string;
  analyst: string;
  comment: string;
}

export interface LegalEntityComplianceCard {
  clientId: string;
  ogrn: string;
  kpp: string;
  registrationDate: string;
  director: string;
  beneficiaries: string[];
  activity: string;
  riskNote: string;
}

export interface IndividualComplianceCard {
  clientId: string;
  passportMasked: string;
  birthDate: string;
  citizenship: string;
  taxResidenceCountry: string;
  incomeSource: string;
  riskNote: string;
}

export interface TradingProfile {
  id: string;
  clientId: string;
  riskCategory: RiskCategory;
  qualifiedInvestor: boolean;
  allowCashUsage: boolean;
  allowSecuritiesUsage: boolean;
  strategy: 'Консервативная' | 'Сбалансированная' | 'Агрессивная';
  leverageAllowed: boolean;
  updatedAt: string;
}

export interface TradingClientCard {
  clientId: string;
  brokerAccount: string;
  marketAccess: Array<'Фондовый рынок' | 'Срочный рынок' | 'Валютный рынок'>;
  settlementModel: 'T+1' | 'T+2' | 'DVP';
  marginCallThreshold: number;
}

export interface DashboardMetric {
  id: string;
  label: string;
  value: number;
  unit?: string;
  trend: 'up' | 'down' | 'flat';
  delta: number;
}
