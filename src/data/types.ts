export type ClientType = 'ООО' | 'ИП' | 'ПАО' | 'ЗАО' | 'АО' | 'ФЛ';

export type ResidencyStatus = 'Резидент РФ' | 'Нерезидент';

export type ComplianceStatus =
  | 'ПРОЙДЕН'
  | 'НА ПРОВЕРКЕ'
  | 'НА ДОРАБОТКЕ'
  | 'ЗАБЛОКИРОВАН';
export type SubjectStatus = 'Регистрация' | 'Активный клиент' | 'На комплаенсе' | 'Данные заполнены';

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

export type ClientRepresentativeRole = 'Генеральный директор' | 'Представитель';

export interface ClientRepresentative {
  id: string;
  subjectId: string;
  role: ClientRepresentativeRole;
  authorityBasis: string;
  authorityValidUntil: string | null;
  authorityWithoutExpiration: boolean;
}

export interface ClientAddresses {
  registration: ClientRegistrationAddress;
  location: ClientRegistrationAddress;
  mailing: ClientRegistrationAddress;
  locationMatchesRegistration: boolean;
  mailingMatchesRegistration: boolean;
}


export interface IndividualClientDetails {
  birthPlace: string;
  snils: string;
  actualAddressMatches: boolean | null;
  services: string;
  sourceOfFunds: string;
  taxResident: boolean | null;
  legalCapacity: 'Полная' | 'Ограниченная' | 'Недееспособен' | '';
}

export interface RepresentativeDocument {
  type: 'passport_rf' | 'id_card' | 'other';
  title?: string;
  series: string;
  number: string;
  issuedBy: string;
  issuedAt: string;
  divisionCode: string;
}

export interface LegalRepresentative {
  fullName: string;
  position: string;
  birthDate: string;
  document: RepresentativeDocument;
}

export interface LegalEntityClientDetails {
  shortName: string;
  fullName: string;
  englishName: string;
  englishFullName: string;
  parentCompany: string;
  kpp: string;
  ogrn: string;
  registrationDate: string;
  registrationAuthority: string;
  authorizedCapital: string;
  registrarName?: string;
  taxName?: string;
  taxCode?: string;
  fssNumber?: string;
  pfrNumber?: string;
  beneficiary: string;
  authorizedPersons: string;
  okato?: string;
  oktmo?: string;
  okpo?: string;
  okfs?: string;
  okogu?: string;
  representativeDetails?: LegalRepresentative;
}

export type BankAccountStatus = 'Активен' | 'Закрыт' | 'На проверке';

export type BankAccount = {
  id: string;
  bankName: string;
  bik: string;
  accountNumber: string;
  correspondentAccount: string;
  currency: 'RUB' | 'USD' | 'EUR' | 'CNY';
  purpose: string;
  status?: BankAccountStatus;
  openedAt: string;
  isPrimary?: boolean;
};

export interface ClientBankDetails {
  bankName: string;
  bik: string;
  checkingAccount: string;
  correspondentAccount: string;
}

export interface Client {
  id: string;
  code: string;
  isArchived?: boolean;
  archivedAt?: string;
  clientCodes?: string[];
  name: string;
  lastName: string;
  firstName: string;
  middleName: string;
  inn: string;
  ogrnip: string;
  birthDate: string;
  type: ClientType;
  residency: ResidencyStatus;
  subjectStatus: SubjectStatus;
  complianceStatus: ComplianceStatus;
  complianceComment?: string;
  complianceOfficer?: string;
  complianceDate?: string;
  managerComment?: string;
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
  addresses: ClientAddresses;
  representatives: ClientRepresentative[];
  bankDetails: ClientBankDetails;
  bankAccounts?: BankAccount[];
  individualDetails?: IndividualClientDetails;
  legalEntityDetails?: LegalEntityClientDetails;
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
  status: 'Действующий' | 'Не действующий' | 'На проверке' | 'На подписи' | 'Отклонена' | 'Архивный' | 'Черновик';
  date: string;
  fileName: string;
}

export interface ClientRelation {
  id: string;
  clientId: string;
  relatedName: string;
  relatedClientId?: string;
  relatedType: string;
  role: 'Представитель' | 'Агент' | 'Бенефициар' | 'Доверенное лицо' | 'Исполнительный орган';
  dateFrom: string;
}

export type ContractProductType = 'broker' | 'depository' | 'trust' | 'iis' | 'other';

export interface ClientContract {
  id: string;
  clientId: string;
  number: string;
  type: ContractProductType;
  openDate: string;
  closeDate?: string | null;
  status: 'active' | 'closed';
}

export interface ClientAccount {
  id: string;
  clientId: string;
  number: string;
  type: ContractProductType;
  openDate: string;
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
  clientName: string;
  clientCode: string;
  status: 'Ожидает' | 'Принято' | 'Отклонено';
  date: string;
  time: string;
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
  investorStatus: TradingInvestorStatus;
  riskLevel: TradingRiskLevel;
  riskAssignedAt: string;
  brokerContractNumber: string;
  accountDisposer: TradingAccountDisposer;
  tradingMethods: TradingMethod[];
  authorityUntil: string;
  tradingStatus: TradingStatus;
  amlStatus: string;
  amlFreezeReason: string;
  codeWord: string;
  orderMethods: TradingOrderMethod[];
  terminals: TradingTerminal[];
  riskCategory: RiskCategory;
  qualifiedInvestor: boolean;
  allowCashUsage: boolean;
  allowSecuritiesUsage: boolean;
  strategy: 'Консервативная' | 'Сбалансированная' | 'Агрессивная';
  leverageAllowed: boolean;
  updatedAt: string;
}

export type TradingInvestorStatus = 'Квал' | 'Неквал';

export type TradingRiskLevel = 'Стандартный' | 'Начальный' | 'Повышенный' | 'Особый';

export type TradingStatus = 'Активен' | 'Истёк';

export type TradingMethod = 'QUIK' | 'Голос';

export type TradingTerminalStatus = 'Подключён' | 'Отключён';

export type TradingTerminalType = 'QUIK Desktop' | 'QUIK Mobile (Android)' | 'WebQUIK';

export interface TradingAccountDisposer {
  name: string;
  role: string;
  powerOfAttorney: string;
  authorityFrom: string;
  authorityUntil: string;
  status: TradingStatus;
}

export interface TradingOrderMethod {
  id: string;
  title: string;
  description: string;
  status: TradingStatus;
}

export interface TradingTerminal {
  id: string;
  type: TradingTerminalType;
  login: string;
  uid: string;
  issuedAt: string;
  ip?: string;
  certificateUntil?: string;
  status: TradingTerminalStatus;
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
