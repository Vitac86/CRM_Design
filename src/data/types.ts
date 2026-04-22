export type ClientType = 'ООО' | 'ИП' | 'ПАО' | 'ЗАО' | 'АО' | 'ФЛ';

export type ResidencyStatus = 'Резидент РФ' | 'Нерезидент';

export type ComplianceStatus =
  | 'ПРОЙДЕН'
  | 'НА ПРОВЕРКЕ'
  | 'НА ДОРАБОТКЕ'
  | 'БАН';

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

export interface ClientDocument {
  id: string;
  clientId: string;
  title: string;
  documentType: string;
  status: 'Действующий' | 'Не действующий' | 'На проверке' | 'На подписи' | 'Отклонена';
  date: string;
  fileName: string;
}

export interface ClientRelation {
  id: string;
  clientId: string;
  relatedName: string;
  relatedCode: string;
  relatedType: string;
  role: 'Представитель' | 'Агент' | 'Бенефициар' | 'Доверенное лицо' | 'Исполнительный орган';
  dateFrom: string;
  status: 'Активна' | 'Неактивна' | 'На проверке';
}

export interface ClientContract {
  id: string;
  clientId: string;
  number: string;
  signedAt: string;
  contractType: 'Депозитарный' | 'Договор ДУ' | 'Договор БО' | 'Дилерский' | 'Брокерский';
  status: 'Действующий' | 'Не действующий' | 'Закрытый' | 'На подписании';
}

export interface ClientHistoryEvent {
  id: string;
  clientId: string;
  dateTime: string;
  section: string;
  field: string;
  oldValue?: string;
  newValue?: string;
  user: string;
}

export interface Request {
  id: string;
  clientId: string;
  number: string;
  requestType: string;
  status: 'Ожидает' | 'Принято' | 'Отклонено';
  date: string;
  source: 'Личный кабинет' | 'Почта';
}

export type ReportDepartment = 'Мидл-офис' | 'Бэк-офис' | 'Депозитарий';
export type ReportType =
  | 'Ежедневный'
  | 'Годовой'
  | 'Месячный'
  | 'Квартальный'
  | 'Недельный'
  | 'Брокерский отчёт'
  | 'Депозитарный отчёт'
  | 'Отчёт ДУ'
  | 'Налоговая справка';
export type ReportDeliveryChannel = 'Личный кабинет' | 'Почта' | 'E-mail';
export type ReportDeliveryStatus = 'Доставлен' | 'Ожидает' | 'Ошибка';

export interface Report {
  id: string;
  department: ReportDepartment;
  clientName: string;
  clientCode: string;
  reportTitle: string;
  reportType: ReportType;
  period: string;
  deliveryChannel: ReportDeliveryChannel;
  deliveryStatus: ReportDeliveryStatus;
  sentAt: string;
  address: string;
  contractNumber: string;
  createdBy: string;
  fileName: string;
  fileSize: string;
  deliveryResult?: 'Доставлено' | 'Не доставлено';
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
