import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClientProfileHeader } from '../components/crm/ClientProfileHeader';
import { PermissionCard } from '../components/crm/PermissionCard';
import { PersonCard } from '../components/crm/PersonCard';
import { ProfileField } from '../components/crm/ProfileField';
import { ProfileSection } from '../components/crm/ProfileSection';
import { ReportMethodCard } from '../components/crm/ReportMethodCard';
import { EmptyState, Button, FormField, Badge } from '../components/ui';
import { SubjectDocumentsTab } from '../components/crm/SubjectDocumentsTab';
import { SubjectRelationsTab } from '../components/crm/SubjectRelationsTab';
import { SubjectContractsTab } from '../components/crm/SubjectContractsTab';
import { SubjectHistoryTab } from '../components/crm/SubjectHistoryTab';
import { SubjectBankAccountsTab } from '../components/crm/SubjectBankAccountsTab';
import { SubjectProfileTabs, type SubjectProfileTab } from '../components/crm/SubjectProfileTabs';
import { formatClientType, formatResidency } from '../utils/labels';
import { useClientsStore } from '../app/ClientsStore';
import type { BankAccount, Client, ClientType, ResidencyStatus } from '../data/types';

const clientTypeOptions: ClientType[] = ['ООО', 'ИП', 'ПАО', 'ЗАО', 'АО', 'ФЛ'];
const residencyOptions: ResidencyStatus[] = ['Резидент РФ', 'Нерезидент'];

const complianceBadgeVariantMap: Record<Client['complianceStatus'], 'success' | 'warning' | 'danger' | 'orange'> = {
  ПРОЙДЕН: 'success',
  'НА ПРОВЕРКЕ': 'warning',
  'НА ДОРАБОТКЕ': 'orange',
  ЗАБЛОКИРОВАН: 'danger',
};

const shouldShowSendToComplianceButton = (status: string) => {
  const normalized = status.trim().toUpperCase();
  return normalized === 'НА ДОРАБОТКЕ' || normalized === 'ЧЕРНОВИК' || normalized === 'НЕ ОТПРАВЛЕН';
};

export const SubjectProfilePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<SubjectProfileTab>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [draftClient, setDraftClient] = useState<Client | undefined>();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAllClientCodes, setShowAllClientCodes] = useState(false);
  const { getClientById, updateClient, archiveClient } = useClientsStore();

  const client = useMemo(() => {
    if (!id) {
      return undefined;
    }

    return getClientById(id);
  }, [getClientById, id]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleTabChange = (nextTab: SubjectProfileTab) => {
    setActiveTab(nextTab);
    setShowAllClientCodes(false);
    if (nextTab !== 'profile' && isEditing) {
      setIsEditing(false);
      setDraftClient(undefined);
      setValidationError(null);
    }
  };

  const handleStartEdit = () => {
    if (!client) {
      return;
    }

    setActiveTab('profile');
    setDraftClient({
      ...client,
      roles: [...client.roles],
      manager: { ...client.manager },
      agent: { ...client.agent },
      reportDelivery: {
        email: { ...client.reportDelivery.email },
        personalAccount: { ...client.reportDelivery.personalAccount },
      },
      registrationAddress: { ...client.registrationAddress },
      bankDetails: { ...client.bankDetails },
      bankAccounts: client.bankAccounts ? [...client.bankAccounts] : undefined,
      individualDetails: client.individualDetails ? { ...client.individualDetails } : undefined,
      legalEntityDetails: client.legalEntityDetails
        ? {
            ...client.legalEntityDetails,
            representativeDetails: client.legalEntityDetails.representativeDetails
              ? {
                  ...client.legalEntityDetails.representativeDetails,
                  document: { ...client.legalEntityDetails.representativeDetails.document },
                }
              : undefined,
          }
        : undefined,
    });
    setValidationError(null);
    setShowAllClientCodes(false);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraftClient(undefined);
    setValidationError(null);
    setIsEditing(false);
    setShowAllClientCodes(false);
  };

  const handleSaveEdit = () => {
    if (!client || !draftClient) {
      return;
    }

    const missingFields: string[] = [];
    if (!draftClient.name.trim()) {
      missingFields.push('Название/ФИО');
    }
    if (!draftClient.inn.trim()) {
      missingFields.push('ИНН');
    }
    if (!draftClient.phone.trim() && !draftClient.email.trim()) {
      missingFields.push('Телефон или Email');
    }
    if ((draftClient.type === 'ФЛ' || draftClient.type === 'ИП') && !draftClient.lastName.trim()) {
      missingFields.push('Фамилия');
    }
    if ((draftClient.type === 'ФЛ' || draftClient.type === 'ИП') && !draftClient.firstName.trim()) {
      missingFields.push('Имя');
    }

    if (missingFields.length > 0) {
      setValidationError(`Заполните обязательные поля: ${missingFields.join(', ')}`);
      return;
    }

    const normalizedClient = { ...draftClient };
    if (normalizedClient.type === 'ФЛ' || normalizedClient.type === 'ИП') {
      const fullName = [normalizedClient.lastName, normalizedClient.firstName, normalizedClient.middleName]
        .map((value) => value.trim())
        .filter(Boolean)
        .join(' ');
      normalizedClient.name = normalizedClient.type === 'ИП' ? `ИП ${fullName}` : fullName;
    } else {
      normalizedClient.name = normalizedClient.legalEntityDetails?.shortName?.trim() || normalizedClient.name.trim();
    }

    const { bankDetails: _bankDetails, bankAccounts: _bankAccounts, ...profilePatch } = normalizedClient;
    updateClient(client.id, profilePatch);
    setIsEditing(false);
    setDraftClient(undefined);
    setValidationError(null);
    setShowAllClientCodes(false);
    setToastMessage('Данные клиента сохранены');
  };

  const handleAddBankAccount = (account: BankAccount) => {
    if (!client) {
      return;
    }

    updateClient(client.id, {
      bankAccounts: [...(client.bankAccounts ?? []), account],
    });
    setToastMessage('Банковский счёт добавлен');
  };

  const handleUpdateBankAccounts = (bankAccounts: BankAccount[]) => {
    if (!client) {
      return;
    }

    updateClient(client.id, { bankAccounts: [...bankAccounts] });
    setToastMessage('Банковские реквизиты обновлены');
  };

  const handleArchiveClient = () => {
    if (!client) {
      return;
    }

    archiveClient(client.id);
    setToastMessage('Субъект перемещён в архив');
    window.setTimeout(() => navigate('/archives'), 300);
  };

  const handleSendToCompliance = () => {
    if (!client) {
      return;
    }

    updateClient(client.id, { complianceStatus: 'НА ПРОВЕРКЕ' });
    setToastMessage('Субъект отправлен на комплаенс');
  };

  const handleOpenContractTab = () => {
    handleTabChange('contracts');
  };

  if (!client) {
    return (
      <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
        <EmptyState title="Клиент не найден" description="Проверьте ссылку или вернитесь к списку субъектов." />
      </div>
    );
  }

  const currentClient = isEditing ? draftClient : client;
  if (!currentClient) {
    return null;
  }
  const uniqueClientCodes = Array.from(new Set([currentClient.code, ...(currentClient.clientCodes ?? [])]));
  const additionalClientCodes = uniqueClientCodes.filter((code) => code !== currentClient.code);
  const hasExtraClientCodes = (currentClient.clientCodes?.length ?? 0) > 1 && additionalClientCodes.length > 0;
  const visibleAdditionalCodes = showAllClientCodes ? additionalClientCodes : additionalClientCodes.slice(0, 8);
  const isIndividualClient = currentClient.type === 'ФЛ' || currentClient.type === 'ИП';

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <ClientProfileHeader
        client={currentClient}
        actions={
          isEditing && activeTab === 'profile' ? (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
                Отмена
              </Button>
              <Button size="sm" className="border-emerald-600 bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveEdit}>
                Сохранить
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {!client.isArchived ? (
                <Button variant="secondary" size="sm" onClick={handleArchiveClient}>
                  В архив
                </Button>
              ) : null}
              <Button variant="secondary" size="sm" onClick={handleStartEdit}>
                Редактировать
              </Button>
              <Button size="sm" onClick={handleOpenContractTab}>
                Оформить договор
              </Button>
            </div>
          )
        }
      />

      {isEditing && activeTab === 'profile' ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true">
              <path
                d="M12.083 3.125a1.768 1.768 0 012.5 2.5l-7.5 7.5-3.333.833.833-3.333 7.5-7.5z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M10.417 4.792l4.791 4.791" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <div>
              <p className="font-semibold">Вы редактируете данные клиента</p>
              <p className="text-amber-800/90">Изменения сохранятся локально после нажатия «Сохранить».</p>
            </div>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-800">Режим редактирования</span>
        </div>
      ) : null}

      <SubjectProfileTabs activeTab={activeTab} onChange={handleTabChange} />

      {activeTab === 'profile' ? (
        <div className="space-y-4">
          {validationError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{validationError}</div>
          ) : null}

          {hasExtraClientCodes ? (
            <ProfileSection title="Идентификаторы клиента">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm">
                  <span className="text-slate-500">Основной код</span>
                  <span className="font-mono font-semibold text-slate-900">{currentClient.code}</span>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Дополнительные коды</p>
                  <div className="flex flex-wrap gap-2">
                    {visibleAdditionalCodes.map((code) => (
                      <span
                        key={code}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-mono text-slate-700"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
                {additionalClientCodes.length > 8 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllClientCodes((current) => !current)}
                    className="text-xs font-medium text-slate-600 transition hover:text-slate-900"
                  >
                    {showAllClientCodes ? 'Скрыть' : 'Показать все коды'}
                  </button>
                ) : null}
              </div>
            </ProfileSection>
          ) : null}

          <ProfileSection title="Основные данные">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {isEditing ? (
                <>
                  {isIndividualClient ? (
                    <>
                      <FormField
                        label="Фамилия"
                        value={currentClient.lastName}
                        onChange={(event) => setDraftClient((prev) => (prev ? { ...prev, lastName: event.target.value } : prev))}
                      />
                      <FormField
                        label="Имя"
                        value={currentClient.firstName}
                        onChange={(event) => setDraftClient((prev) => (prev ? { ...prev, firstName: event.target.value } : prev))}
                      />
                      <FormField
                        label="Отчество"
                        value={currentClient.middleName}
                        onChange={(event) => setDraftClient((prev) => (prev ? { ...prev, middleName: event.target.value } : prev))}
                      />
                    </>
                  ) : (
                    <>
                      <FormField
                        label="Наименование клиента"
                        value={currentClient.legalEntityDetails?.shortName ?? currentClient.name}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  name: event.target.value,
                                  legalEntityDetails: {
                                    shortName: event.target.value,
                                    fullName: prev.legalEntityDetails?.fullName ?? '',
                                    englishName: prev.legalEntityDetails?.englishName ?? '',
                                    englishFullName: prev.legalEntityDetails?.englishFullName ?? '',
                                    parentCompany: prev.legalEntityDetails?.parentCompany ?? '',
                                    kpp: prev.legalEntityDetails?.kpp ?? '',
                                    ogrn: prev.legalEntityDetails?.ogrn ?? '',
                                    registrationDate: prev.legalEntityDetails?.registrationDate ?? '',
                                    registrationAuthority: prev.legalEntityDetails?.registrationAuthority ?? '',
                                    authorizedCapital: prev.legalEntityDetails?.authorizedCapital ?? '',
                                    registrarName: prev.legalEntityDetails?.registrarName ?? '',
                                    taxName: prev.legalEntityDetails?.taxName ?? '',
                                    taxCode: prev.legalEntityDetails?.taxCode ?? '',
                                    fssNumber: prev.legalEntityDetails?.fssNumber ?? '',
                                    pfrNumber: prev.legalEntityDetails?.pfrNumber ?? '',
                                    beneficiary: prev.legalEntityDetails?.beneficiary ?? '',
                                    authorizedPersons: prev.legalEntityDetails?.authorizedPersons ?? '',
                                    okato: prev.legalEntityDetails?.okato ?? '',
                                    oktmo: prev.legalEntityDetails?.oktmo ?? '',
                                    okpo: prev.legalEntityDetails?.okpo ?? '',
                                    okfs: prev.legalEntityDetails?.okfs ?? '',
                                    okogu: prev.legalEntityDetails?.okogu ?? '',
                                  },
                                }
                              : prev,
                          )
                        }
                      />
                      <FormField
                        label="Полное наименование"
                        value={currentClient.legalEntityDetails?.fullName ?? ''}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev && prev.legalEntityDetails
                              ? { ...prev, legalEntityDetails: { ...prev.legalEntityDetails, fullName: event.target.value } }
                              : prev,
                          )
                        }
                      />
                      <FormField
                        label="Английское наименование"
                        value={currentClient.legalEntityDetails?.englishName ?? ''}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev && prev.legalEntityDetails
                              ? { ...prev, legalEntityDetails: { ...prev.legalEntityDetails, englishName: event.target.value } }
                              : prev,
                          )
                        }
                      />
                    </>
                  )}
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Тип клиента</span>
                    <select
                      value={currentClient.type}
                      onChange={(event) =>
                        setDraftClient((prev) => (prev ? { ...prev, type: event.target.value as ClientType } : prev))
                      }
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                    >
                      {clientTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Признак резидентства</span>
                    <select
                      value={currentClient.residency}
                      onChange={(event) =>
                        setDraftClient((prev) => (prev ? { ...prev, residency: event.target.value as ResidencyStatus } : prev))
                      }
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                    >
                      {residencyOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  {isIndividualClient ? (
                    <FormField
                      label="Дата рождения"
                      type="date"
                      value={currentClient.birthDate === '—' ? '' : currentClient.birthDate}
                      onChange={(event) => setDraftClient((prev) => (prev ? { ...prev, birthDate: event.target.value || '—' } : prev))}
                    />
                  ) : null}
                  <FormField
                    label="ИНН"
                    value={currentClient.inn}
                    mono
                    onChange={(event) => setDraftClient((prev) => (prev ? { ...prev, inn: event.target.value } : prev))}
                  />
                  {isIndividualClient ? (
                    <FormField
                      label="СНИЛС"
                      value={currentClient.individualDetails?.snils ?? ''}
                      mono
                      onChange={(event) =>
                        setDraftClient((prev) =>
                          prev
                            ? {
                                ...prev,
                                individualDetails: {
                                  birthPlace: prev.individualDetails?.birthPlace ?? '',
                                  snils: event.target.value,
                                  actualAddressMatches: prev.individualDetails?.actualAddressMatches ?? null,
                                  services: prev.individualDetails?.services ?? '',
                                  sourceOfFunds: prev.individualDetails?.sourceOfFunds ?? '',
                                  taxResident: prev.individualDetails?.taxResident ?? null,
                                  legalCapacity: prev.individualDetails?.legalCapacity ?? '',
                                },
                              }
                            : prev,
                        )
                      }
                    />
                  ) : (
                    <>
                      <FormField
                        label="КПП"
                        value={currentClient.legalEntityDetails?.kpp ?? ''}
                        mono
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev && prev.legalEntityDetails
                              ? { ...prev, legalEntityDetails: { ...prev.legalEntityDetails, kpp: event.target.value } }
                              : prev,
                          )
                        }
                      />
                      <FormField
                        label="ОГРН"
                        value={currentClient.legalEntityDetails?.ogrn ?? ''}
                        mono
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev && prev.legalEntityDetails
                              ? { ...prev, legalEntityDetails: { ...prev.legalEntityDetails, ogrn: event.target.value } }
                              : prev,
                          )
                        }
                      />
                    </>
                  )}
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Признак инвестора</span>
                    <select
                      value={currentClient.qualification ? 'qualified' : 'not-qualified'}
                      onChange={(event) =>
                        setDraftClient((prev) => (prev ? { ...prev, qualification: event.target.value === 'qualified' } : prev))
                      }
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                    >
                      <option value="qualified">Квалифицированный</option>
                      <option value="not-qualified">Неквалифицированный</option>
                    </select>
                  </label>
                </>
              ) : (
                <>
                  {isIndividualClient ? (
                    <>
                      <ProfileField label="Фамилия" value={client.lastName} />
                      <ProfileField label="Имя" value={client.firstName} />
                      <ProfileField label="Отчество" value={client.middleName} />
                    </>
                  ) : (
                    <>
                      <ProfileField label="Наименование клиента" value={client.legalEntityDetails?.shortName ?? client.name} />
                      <ProfileField label="Полное наименование" value={client.legalEntityDetails?.fullName ?? '—'} />
                      <ProfileField label="Английское наименование" value={client.legalEntityDetails?.englishName ?? '—'} />
                    </>
                  )}
                  <ProfileField label="Тип клиента" value={formatClientType(client.type)} />
                  <ProfileField label="Признак резидентства" value={formatResidency(client.residency)} />
                  {isIndividualClient ? <ProfileField label="Дата рождения" value={client.birthDate} /> : null}
                  <ProfileField label="ИНН" value={client.inn} mono />
                  {isIndividualClient ? (
                    <ProfileField label="СНИЛС" value={client.individualDetails?.snils ?? '—'} mono />
                  ) : (
                    <>
                      <ProfileField label="КПП" value={client.legalEntityDetails?.kpp ?? '—'} mono />
                      <ProfileField label="ОГРН" value={client.legalEntityDetails?.ogrn ?? '—'} mono />
                    </>
                  )}
                  <ProfileField label="Признак инвестора" value={client.qualification ? 'Квалифицированный' : 'Неквалифицированный'} />
                </>
              )}
            </div>
          </ProfileSection>

          {isIndividualClient ? (
            <ProfileSection title="Контактные данные">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {isEditing ? (
                <>
                  <FormField
                    label="Телефон"
                    type="tel"
                    value={currentClient.phone}
                    mono
                    onChange={(event) => setDraftClient((prev) => (prev ? { ...prev, phone: event.target.value } : prev))}
                  />
                  <FormField
                    label="Дополнительный телефон"
                    type="tel"
                    value={currentClient.secondaryPhone}
                    mono
                    onChange={(event) => setDraftClient((prev) => (prev ? { ...prev, secondaryPhone: event.target.value } : prev))}
                  />
                  <FormField
                    label="Email"
                    type="email"
                    value={currentClient.email}
                    onChange={(event) => setDraftClient((prev) => (prev ? { ...prev, email: event.target.value } : prev))}
                  />
                  {!isIndividualClient ? (
                    <>
                      <FormField
                        label="Адрес"
                        value={currentClient.address}
                        onChange={(event) => setDraftClient((prev) => (prev ? { ...prev, address: event.target.value } : prev))}
                      />
                      <FormField
                        label="Представитель"
                        value={currentClient.representative}
                        onChange={(event) => setDraftClient((prev) => (prev ? { ...prev, representative: event.target.value } : prev))}
                      />
                      <FormField
                        label="Выгодоприобретатель"
                        value={currentClient.legalEntityDetails?.beneficiary ?? ''}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev && prev.legalEntityDetails
                              ? { ...prev, legalEntityDetails: { ...prev.legalEntityDetails, beneficiary: event.target.value } }
                              : prev,
                          )
                        }
                      />
                      <FormField
                        label="Лица, действующие без доверенности"
                        value={currentClient.legalEntityDetails?.authorizedPersons ?? ''}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev && prev.legalEntityDetails
                              ? { ...prev, legalEntityDetails: { ...prev.legalEntityDetails, authorizedPersons: event.target.value } }
                              : prev,
                          )
                        }
                      />
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <ProfileField label="Телефон" value={client.phone} mono />
                  <ProfileField label="Дополнительный телефон" value={client.secondaryPhone} mono />
                  <ProfileField label="Email" value={client.email} />
                  {!isIndividualClient ? <ProfileField label="Адрес" value={client.address} /> : null}
                  {!isIndividualClient ? <ProfileField label="Представитель" value={client.representative} /> : null}
                  {!isIndividualClient ? <ProfileField label="Выгодоприобретатель" value={client.legalEntityDetails?.beneficiary ?? '—'} /> : null}
                  {!isIndividualClient ? <ProfileField label="Лица, действующие без доверенности" value={client.legalEntityDetails?.authorizedPersons ?? '—'} /> : null}
                </>
              )}
            </div>
            </ProfileSection>
          ) : null}



          {!isIndividualClient && currentClient.legalEntityDetails?.representativeDetails ? (
            <ProfileSection title="Представитель">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {isEditing ? (
                  <>
                    <FormField
                      label="ФИО"
                      value={currentClient.legalEntityDetails.representativeDetails.fullName}
                      onChange={(event) =>
                        setDraftClient((prev) =>
                          prev && prev.legalEntityDetails?.representativeDetails
                            ? {
                                ...prev,
                                legalEntityDetails: {
                                  ...prev.legalEntityDetails,
                                  representativeDetails: { ...prev.legalEntityDetails.representativeDetails, fullName: event.target.value },
                                },
                              }
                            : prev,
                        )
                      }
                    />
                    <FormField
                      label="Должность"
                      value={currentClient.legalEntityDetails.representativeDetails.position}
                      onChange={(event) =>
                        setDraftClient((prev) =>
                          prev && prev.legalEntityDetails?.representativeDetails
                            ? {
                                ...prev,
                                legalEntityDetails: {
                                  ...prev.legalEntityDetails,
                                  representativeDetails: { ...prev.legalEntityDetails.representativeDetails, position: event.target.value },
                                },
                              }
                            : prev,
                        )
                      }
                    />
                    <FormField
                      label="Дата рождения"
                      type="date"
                      value={currentClient.legalEntityDetails.representativeDetails.birthDate}
                      onChange={(event) =>
                        setDraftClient((prev) =>
                          prev && prev.legalEntityDetails?.representativeDetails
                            ? {
                                ...prev,
                                legalEntityDetails: {
                                  ...prev.legalEntityDetails,
                                  representativeDetails: { ...prev.legalEntityDetails.representativeDetails, birthDate: event.target.value },
                                },
                              }
                            : prev,
                        )
                      }
                    />
                    <FormField
                      label="Документ"
                      value={currentClient.legalEntityDetails.representativeDetails.document.title ?? ''}
                      onChange={(event) =>
                        setDraftClient((prev) =>
                          prev && prev.legalEntityDetails?.representativeDetails
                            ? {
                                ...prev,
                                legalEntityDetails: {
                                  ...prev.legalEntityDetails,
                                  representativeDetails: {
                                    ...prev.legalEntityDetails.representativeDetails,
                                    document: { ...prev.legalEntityDetails.representativeDetails.document, title: event.target.value },
                                  },
                                },
                              }
                            : prev,
                        )
                      }
                    />
                  </>
                ) : (
                  <>
                    <ProfileField label="ФИО" value={currentClient.legalEntityDetails.representativeDetails.fullName} />
                    <ProfileField label="Должность" value={currentClient.legalEntityDetails.representativeDetails.position} />
                    <ProfileField label="Дата рождения" value={currentClient.legalEntityDetails.representativeDetails.birthDate} />
                    <ProfileField
                      label="Тип документа"
                      value={
                        currentClient.legalEntityDetails.representativeDetails.document.type === 'passport_rf'
                          ? 'Паспорт РФ'
                          : currentClient.legalEntityDetails.representativeDetails.document.type === 'id_card'
                            ? 'ID'
                            : 'Иной документ'
                      }
                    />
                    <ProfileField
                      label="Реквизиты документа"
                      value={[
                        currentClient.legalEntityDetails.representativeDetails.document.title,
                        currentClient.legalEntityDetails.representativeDetails.document.series &&
                          `серия ${currentClient.legalEntityDetails.representativeDetails.document.series}`,
                        currentClient.legalEntityDetails.representativeDetails.document.number &&
                          `№ ${currentClient.legalEntityDetails.representativeDetails.document.number}`,
                        currentClient.legalEntityDetails.representativeDetails.document.issuedBy,
                        currentClient.legalEntityDetails.representativeDetails.document.issuedAt &&
                          `от ${currentClient.legalEntityDetails.representativeDetails.document.issuedAt}`,
                        currentClient.legalEntityDetails.representativeDetails.document.divisionCode &&
                          `код подразделения ${currentClient.legalEntityDetails.representativeDetails.document.divisionCode}`,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    />
                  </>
                )}
              </div>
            </ProfileSection>
          ) : null}

          {isIndividualClient ? (
          <ProfileSection title="Адрес регистрации">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {isEditing ? (
                <>
                  <FormField
                    label="Страна"
                    value={currentClient.registrationAddress.country}
                    onChange={(event) =>
                      setDraftClient((prev) =>
                        prev ? { ...prev, registrationAddress: { ...prev.registrationAddress, country: event.target.value } } : prev,
                      )
                    }
                  />
                  <FormField
                    label="Регион"
                    value={currentClient.registrationAddress.region}
                    onChange={(event) =>
                      setDraftClient((prev) =>
                        prev ? { ...prev, registrationAddress: { ...prev.registrationAddress, region: event.target.value } } : prev,
                      )
                    }
                  />
                  <FormField
                    label="Район"
                    value={currentClient.registrationAddress.district}
                    onChange={(event) =>
                      setDraftClient((prev) =>
                        prev ? { ...prev, registrationAddress: { ...prev.registrationAddress, district: event.target.value } } : prev,
                      )
                    }
                  />
                  <FormField
                    label="Город"
                    value={currentClient.registrationAddress.city}
                    onChange={(event) =>
                      setDraftClient((prev) =>
                        prev ? { ...prev, registrationAddress: { ...prev.registrationAddress, city: event.target.value } } : prev,
                      )
                    }
                  />
                  <FormField
                    label="Индекс"
                    value={currentClient.registrationAddress.postalCode}
                    mono
                    onChange={(event) =>
                      setDraftClient((prev) =>
                        prev ? { ...prev, registrationAddress: { ...prev.registrationAddress, postalCode: event.target.value } } : prev,
                      )
                    }
                  />
                  <FormField
                    label="Улица"
                    value={currentClient.registrationAddress.street}
                    onChange={(event) =>
                      setDraftClient((prev) =>
                        prev ? { ...prev, registrationAddress: { ...prev.registrationAddress, street: event.target.value } } : prev,
                      )
                    }
                  />
                  <FormField
                    label="Дом"
                    value={currentClient.registrationAddress.house}
                    onChange={(event) =>
                      setDraftClient((prev) =>
                        prev ? { ...prev, registrationAddress: { ...prev.registrationAddress, house: event.target.value } } : prev,
                      )
                    }
                  />
                  <FormField
                    label="Корпус"
                    value={currentClient.registrationAddress.building}
                    onChange={(event) =>
                      setDraftClient((prev) =>
                        prev ? { ...prev, registrationAddress: { ...prev.registrationAddress, building: event.target.value } } : prev,
                      )
                    }
                  />
                  <FormField
                    label="Квартира"
                    value={currentClient.registrationAddress.apartment}
                    onChange={(event) =>
                      setDraftClient((prev) =>
                        prev ? { ...prev, registrationAddress: { ...prev.registrationAddress, apartment: event.target.value } } : prev,
                      )
                    }
                  />
                </>
              ) : (
                <>
                  <ProfileField label="Страна" value={client.registrationAddress.country} />
                  <ProfileField label="Регион" value={client.registrationAddress.region} />
                  <ProfileField label="Район" value={client.registrationAddress.district} />
                  <ProfileField label="Город" value={client.registrationAddress.city} />
                  <ProfileField label="Индекс" value={client.registrationAddress.postalCode} mono />
                  <ProfileField label="Улица" value={client.registrationAddress.street} />
                  <ProfileField label="Дом" value={client.registrationAddress.house} />
                  <ProfileField label="Корпус" value={client.registrationAddress.building} />
                  <ProfileField label="Квартира" value={client.registrationAddress.apartment} />
                </>
              )}
            </div>
          </ProfileSection>
          ) : null}

          {isIndividualClient ? (
            <ProfileSection title="Дополнительные данные">
              <div className="grid gap-4 md:grid-cols-2">
                {isEditing ? (
                  <>
                    <FormField
                      label="Место рождения"
                      value={currentClient.individualDetails?.birthPlace ?? ''}
                      onChange={(event) =>
                        setDraftClient((prev) =>
                          prev
                            ? {
                                ...prev,
                                individualDetails: {
                                  birthPlace: event.target.value,
                                  snils: prev.individualDetails?.snils ?? '',
                                  actualAddressMatches: prev.individualDetails?.actualAddressMatches ?? null,
                                  services: prev.individualDetails?.services ?? '',
                                  sourceOfFunds: prev.individualDetails?.sourceOfFunds ?? '',
                                  taxResident: prev.individualDetails?.taxResident ?? null,
                                  legalCapacity: prev.individualDetails?.legalCapacity ?? '',
                                },
                              }
                            : prev,
                        )
                      }
                    />
                    <FormField
                      label="Услуги"
                      value={currentClient.individualDetails?.services ?? ''}
                      onChange={(event) =>
                        setDraftClient((prev) =>
                          prev && prev.individualDetails
                            ? { ...prev, individualDetails: { ...prev.individualDetails, services: event.target.value } }
                            : prev,
                        )
                      }
                    />
                    <FormField
                      label="Источник средств"
                      value={currentClient.individualDetails?.sourceOfFunds ?? ''}
                      onChange={(event) =>
                        setDraftClient((prev) =>
                          prev && prev.individualDetails
                            ? { ...prev, individualDetails: { ...prev.individualDetails, sourceOfFunds: event.target.value } }
                            : prev,
                        )
                      }
                    />
                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Налоговый резидент</span>
                      <select
                        value={currentClient.individualDetails?.taxResident == null ? '' : currentClient.individualDetails.taxResident ? 'yes' : 'no'}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  individualDetails: {
                                    birthPlace: prev.individualDetails?.birthPlace ?? '',
                                    snils: prev.individualDetails?.snils ?? '',
                                    actualAddressMatches: prev.individualDetails?.actualAddressMatches ?? null,
                                    services: prev.individualDetails?.services ?? '',
                                    sourceOfFunds: prev.individualDetails?.sourceOfFunds ?? '',
                                    taxResident: event.target.value === '' ? null : event.target.value === 'yes',
                                    legalCapacity: prev.individualDetails?.legalCapacity ?? '',
                                  },
                                }
                              : prev,
                          )
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                      >
                        <option value="">—</option>
                        <option value="yes">Да</option>
                        <option value="no">Нет</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Дееспособность</span>
                      <select
                        value={currentClient.individualDetails?.legalCapacity ?? ''}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  individualDetails: {
                                    birthPlace: prev.individualDetails?.birthPlace ?? '',
                                    snils: prev.individualDetails?.snils ?? '',
                                    actualAddressMatches: prev.individualDetails?.actualAddressMatches ?? null,
                                    services: prev.individualDetails?.services ?? '',
                                    sourceOfFunds: prev.individualDetails?.sourceOfFunds ?? '',
                                    taxResident: prev.individualDetails?.taxResident ?? null,
                                    legalCapacity: event.target.value as 'Полная' | 'Ограниченная' | 'Недееспособен' | '',
                                  },
                                }
                              : prev,
                          )
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                      >
                        <option value="">—</option>
                        <option value="Полная">Полная</option>
                        <option value="Ограниченная">Ограниченная</option>
                        <option value="Недееспособен">Недееспособен</option>
                      </select>
                    </label>
                  </>
                ) : (
                  <>
                    <ProfileField label="Место рождения" value={client.individualDetails?.birthPlace ?? '—'} />
                    <ProfileField label="Услуги" value={client.individualDetails?.services ?? '—'} />
                    <ProfileField label="Источник средств" value={client.individualDetails?.sourceOfFunds ?? '—'} />
                    <ProfileField
                      label="Налоговый резидент"
                      value={client.individualDetails?.taxResident == null ? '—' : client.individualDetails.taxResident ? 'Да' : 'Нет'}
                    />
                    <ProfileField label="Дееспособность" value={client.individualDetails?.legalCapacity || '—'} />
                  </>
                )}
              </div>
            </ProfileSection>
          ) : (
            <>
              <ProfileSection title="Регистрационные данные">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {isEditing ? (
                    <>
                      <FormField
                        label="Дата регистрации"
                        type="date"
                        value={currentClient.legalEntityDetails?.registrationDate ?? ''}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev && prev.legalEntityDetails
                              ? { ...prev, legalEntityDetails: { ...prev.legalEntityDetails, registrationDate: event.target.value } }
                              : prev,
                          )
                        }
                      />
                      <FormField
                        label="Регистрирующий орган"
                        value={currentClient.legalEntityDetails?.registrationAuthority ?? ''}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev && prev.legalEntityDetails
                              ? { ...prev, legalEntityDetails: { ...prev.legalEntityDetails, registrationAuthority: event.target.value } }
                              : prev,
                          )
                        }
                      />
                      <FormField
                        label="Уставный капитал"
                        value={currentClient.legalEntityDetails?.authorizedCapital ?? ''}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev && prev.legalEntityDetails
                              ? { ...prev, legalEntityDetails: { ...prev.legalEntityDetails, authorizedCapital: event.target.value } }
                              : prev,
                          )
                        }
                      />
                      <FormField
                        label="Наименование регистратора"
                        value={currentClient.legalEntityDetails?.registrarName ?? ''}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev && prev.legalEntityDetails
                              ? { ...prev, legalEntityDetails: { ...prev.legalEntityDetails, registrarName: event.target.value } }
                              : prev,
                          )
                        }
                      />
                    </>
                  ) : (
                    <>
                      <ProfileField label="Дата регистрации" value={client.legalEntityDetails?.registrationDate ?? '—'} />
                      <ProfileField label="Регистрирующий орган" value={client.legalEntityDetails?.registrationAuthority ?? '—'} />
                      <ProfileField label="Уставный капитал" value={client.legalEntityDetails?.authorizedCapital ?? '—'} />
                      <ProfileField label="Наименование регистратора" value={client.legalEntityDetails?.registrarName ?? '—'} />
                    </>
                  )}
                </div>
              </ProfileSection>
              <ProfileSection title="Налоговые данные">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {isEditing ? (
                    <>
                      <FormField
                        label="Наименование налоговой"
                        value={currentClient.legalEntityDetails?.taxName ?? ''}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev && prev.legalEntityDetails
                              ? { ...prev, legalEntityDetails: { ...prev.legalEntityDetails, taxName: event.target.value } }
                              : prev,
                          )
                        }
                      />
                      <FormField
                        label="Код налоговой"
                        value={currentClient.legalEntityDetails?.taxCode ?? ''}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev && prev.legalEntityDetails
                              ? { ...prev, legalEntityDetails: { ...prev.legalEntityDetails, taxCode: event.target.value } }
                              : prev,
                          )
                        }
                      />
                      <FormField
                        label="Номер ФСС"
                        value={currentClient.legalEntityDetails?.fssNumber ?? ''}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev && prev.legalEntityDetails
                              ? { ...prev, legalEntityDetails: { ...prev.legalEntityDetails, fssNumber: event.target.value } }
                              : prev,
                          )
                        }
                      />
                      <FormField
                        label="Номер ПФР"
                        value={currentClient.legalEntityDetails?.pfrNumber ?? ''}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev && prev.legalEntityDetails
                              ? { ...prev, legalEntityDetails: { ...prev.legalEntityDetails, pfrNumber: event.target.value } }
                              : prev,
                          )
                        }
                      />
                    </>
                  ) : (
                    <>
                      <ProfileField label="Наименование налоговой" value={client.legalEntityDetails?.taxName ?? '—'} />
                      <ProfileField label="Код налоговой" value={client.legalEntityDetails?.taxCode ?? '—'} />
                      <ProfileField label="Номер ФСС" value={client.legalEntityDetails?.fssNumber ?? '—'} />
                      <ProfileField label="Номер ПФР" value={client.legalEntityDetails?.pfrNumber ?? '—'} />
                    </>
                  )}
                </div>
              </ProfileSection>
              <ProfileSection title="Контактные данные">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {isEditing ? (
                    <>
                      <FormField
                        label="Телефон"
                        type="tel"
                        value={currentClient.phone}
                        mono
                        onChange={(event) => setDraftClient((prev) => (prev ? { ...prev, phone: event.target.value } : prev))}
                      />
                      <FormField
                        label="Дополнительный телефон"
                        type="tel"
                        value={currentClient.secondaryPhone}
                        mono
                        onChange={(event) => setDraftClient((prev) => (prev ? { ...prev, secondaryPhone: event.target.value } : prev))}
                      />
                      <FormField
                        label="Email"
                        type="email"
                        value={currentClient.email}
                        onChange={(event) => setDraftClient((prev) => (prev ? { ...prev, email: event.target.value } : prev))}
                      />
                      <FormField
                        label="Адрес"
                        value={currentClient.address}
                        onChange={(event) => setDraftClient((prev) => (prev ? { ...prev, address: event.target.value } : prev))}
                      />
                      <FormField
                        label="Представитель"
                        value={currentClient.representative}
                        onChange={(event) => setDraftClient((prev) => (prev ? { ...prev, representative: event.target.value } : prev))}
                      />
                      <FormField
                        label="Выгодоприобретатель"
                        value={currentClient.legalEntityDetails?.beneficiary ?? ''}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev && prev.legalEntityDetails
                              ? { ...prev, legalEntityDetails: { ...prev.legalEntityDetails, beneficiary: event.target.value } }
                              : prev,
                          )
                        }
                      />
                      <FormField
                        label="Лица, действующие без доверенности"
                        value={currentClient.legalEntityDetails?.authorizedPersons ?? ''}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev && prev.legalEntityDetails
                              ? { ...prev, legalEntityDetails: { ...prev.legalEntityDetails, authorizedPersons: event.target.value } }
                              : prev,
                          )
                        }
                      />
                    </>
                  ) : (
                    <>
                      <ProfileField label="Телефон" value={client.phone} mono />
                      <ProfileField label="Дополнительный телефон" value={client.secondaryPhone} mono />
                      <ProfileField label="Email" value={client.email} />
                      <ProfileField label="Адрес" value={client.address} />
                      <ProfileField label="Представитель" value={client.representative} />
                      <ProfileField label="Выгодоприобретатель" value={client.legalEntityDetails?.beneficiary ?? '—'} />
                      <ProfileField label="Лица, действующие без доверенности" value={client.legalEntityDetails?.authorizedPersons ?? '—'} />
                    </>
                  )}
                </div>
              </ProfileSection>
              <ProfileSection title="Коды классификаторов">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {isEditing ? (
                    <>
                      <FormField
                        label="ОКАТО"
                        value={currentClient.legalEntityDetails?.okato ?? ''}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev && prev.legalEntityDetails
                              ? { ...prev, legalEntityDetails: { ...prev.legalEntityDetails, okato: event.target.value } }
                              : prev,
                          )
                        }
                      />
                      <FormField
                        label="ОКТМО"
                        value={currentClient.legalEntityDetails?.oktmo ?? ''}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev && prev.legalEntityDetails
                              ? { ...prev, legalEntityDetails: { ...prev.legalEntityDetails, oktmo: event.target.value } }
                              : prev,
                          )
                        }
                      />
                      <FormField
                        label="ОКПО"
                        value={currentClient.legalEntityDetails?.okpo ?? ''}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev && prev.legalEntityDetails
                              ? { ...prev, legalEntityDetails: { ...prev.legalEntityDetails, okpo: event.target.value } }
                              : prev,
                          )
                        }
                      />
                      <FormField
                        label="ОКФС"
                        value={currentClient.legalEntityDetails?.okfs ?? ''}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev && prev.legalEntityDetails
                              ? { ...prev, legalEntityDetails: { ...prev.legalEntityDetails, okfs: event.target.value } }
                              : prev,
                          )
                        }
                      />
                      <FormField
                        label="ОКОГУ"
                        value={currentClient.legalEntityDetails?.okogu ?? ''}
                        onChange={(event) =>
                          setDraftClient((prev) =>
                            prev && prev.legalEntityDetails
                              ? { ...prev, legalEntityDetails: { ...prev.legalEntityDetails, okogu: event.target.value } }
                              : prev,
                          )
                        }
                      />
                    </>
                  ) : (
                    <>
                      <ProfileField label="ОКАТО" value={client.legalEntityDetails?.okato ?? '—'} />
                      <ProfileField label="ОКТМО" value={client.legalEntityDetails?.oktmo ?? '—'} />
                      <ProfileField label="ОКПО" value={client.legalEntityDetails?.okpo ?? '—'} />
                      <ProfileField label="ОКФС" value={client.legalEntityDetails?.okfs ?? '—'} />
                      <ProfileField label="ОКОГУ" value={client.legalEntityDetails?.okogu ?? '—'} />
                    </>
                  )}
                </div>
              </ProfileSection>
            </>
          )}

          {!isEditing ? (
            <>
              <ProfileSection title="Комплаенс">
                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-slate-900">Комплаенс</h4>
                    <p className="text-sm text-slate-500">Текущая информация по статусу</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Статус комплаенса</p>
                      <Badge variant={complianceBadgeVariantMap[client.complianceStatus]}>{client.complianceStatus}</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Комментарий</p>
                      <p className="text-sm text-slate-700">{client.complianceComment?.trim() || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Дата прохождения</p>
                      <p className="text-sm text-slate-700">{client.complianceDate || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Комплаенс офицер</p>
                      <p className="text-sm text-slate-700">{client.complianceOfficer?.trim() || '—'}</p>
                    </div>
                  </div>
                  {shouldShowSendToComplianceButton(client.complianceStatus) ? (
                    <Button className="w-full md:w-auto" onClick={handleSendToCompliance}>
                      Отправить на комплаенс
                    </Button>
                  ) : null}
                </div>
              </ProfileSection>
              <ProfileSection title="Права использования">
                <div className="grid gap-3 lg:grid-cols-2">
                  <PermissionCard
                    title="Право использования денежных средств"
                    description="Брокер вправе использовать денежные средства клиента"
                    enabled={client.canUseMoney}
                  />
                  <PermissionCard
                    title="Право использования ценных бумаг"
                    description="Брокер вправе использовать ЦБ клиента в сделках"
                    enabled={client.canUseSecurities}
                  />
                </div>
              </ProfileSection>
              <ProfileSection title="Менеджер и агент">
                <div className="grid gap-3 lg:grid-cols-2">
                  <PersonCard
                    title="Менеджер"
                    name={client.manager.name}
                    subtitle={client.manager.role}
                    phone={client.manager.phone}
                    email={client.manager.email}
                  />
                  <PersonCard
                    title="Агент"
                    name={client.agent.name}
                    subtitle={`${client.agent.company} · ${client.agent.code}`}
                    phone={client.agent.phone}
                    email={client.agent.email}
                  />
                </div>
              </ProfileSection>
              <ProfileSection title="Способ получения отчётов">
                <div className="grid gap-3 lg:grid-cols-2">
                  <ReportMethodCard
                    title="Электронная почта"
                    description={client.reportDelivery.email.address}
                    enabled={client.reportDelivery.email.enabled}
                  />
                  <ReportMethodCard
                    title="Личный кабинет"
                    description="Получение отчётов в личном кабинете"
                    enabled={client.reportDelivery.personalAccount.enabled}
                  />
                </div>
              </ProfileSection>
            </>
          ) : null}

          <ProfileSection title="Комментарий менеджера">
            {isEditing ? (
              <label className="space-y-1">
                <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Комментарий менеджера</span>
                <textarea
                  value={currentClient.managerComment ?? ''}
                  onChange={(event) => setDraftClient((prev) => (prev ? { ...prev, managerComment: event.target.value } : prev))}
                  className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                  placeholder="—"
                />
              </label>
            ) : (
              <p className="text-sm leading-6 whitespace-pre-wrap text-slate-700">{client.managerComment?.trim() || '—'}</p>
            )}
          </ProfileSection>

        </div>
      ) : activeTab === 'bankAccounts' ? (
        <SubjectBankAccountsTab client={client} onAddAccount={handleAddBankAccount} onUpdateAccounts={handleUpdateBankAccounts} />
      ) : activeTab === 'documents' ? (
        <SubjectDocumentsTab clientId={client.id} />
      ) : activeTab === 'relations' ? (
        <SubjectRelationsTab clientId={client.id} />
      ) : activeTab === 'contracts' ? (
        <SubjectContractsTab client={client} />
      ) : activeTab === 'history' ? (
        <SubjectHistoryTab clientId={client.id} />
      ) : (
        <EmptyState title="Неизвестная вкладка" description="Выберите доступный раздел карточки клиента." />
      )}

      {toastMessage && (
        <div className="fixed right-6 bottom-6 z-50 rounded-md bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{toastMessage}</div>
      )}
    </div>
  );
};
