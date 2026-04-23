import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import type { BankAccount, Client, ClientRepresentativeRole, ClientType, ResidencyStatus } from '../data/types';

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
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<SubjectProfileTab>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [draftClient, setDraftClient] = useState<Client | undefined>();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAllClientCodes, setShowAllClientCodes] = useState(false);
  const [showAdditionalAddresses, setShowAdditionalAddresses] = useState(false);
  const [isRepresentativeModalOpen, setIsRepresentativeModalOpen] = useState(false);
  const [representativeQuery, setRepresentativeQuery] = useState('');
  const [newRepresentativeSubjectId, setNewRepresentativeSubjectId] = useState('');
  const [newRepresentativeRole, setNewRepresentativeRole] = useState<ClientRepresentativeRole>('Представитель');
  const [newRepresentativeAuthorityBasis, setNewRepresentativeAuthorityBasis] = useState('');
  const [newRepresentativeAuthorityValidUntil, setNewRepresentativeAuthorityValidUntil] = useState('');
  const [newRepresentativeWithoutExpiration, setNewRepresentativeWithoutExpiration] = useState(false);
  const { clients, getClientById, updateClient, archiveClient } = useClientsStore();

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (requestedTab === 'contracts' || requestedTab === 'profile' || requestedTab === 'bankAccounts' || requestedTab === 'documents' || requestedTab === 'relations' || requestedTab === 'history') {
      setActiveTab(requestedTab);
    }
  }, [searchParams]);

  useEffect(() => {
    const state = location.state as { toastMessage?: string } | null;
    if (!state?.toastMessage) {
      return;
    }

    setToastMessage(state.toastMessage);
    navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate]);

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
      addresses: {
        registration: { ...client.addresses.registration },
        location: { ...client.addresses.location },
        mailing: { ...client.addresses.mailing },
        locationMatchesRegistration: client.addresses.locationMatchesRegistration,
        mailingMatchesRegistration: client.addresses.mailingMatchesRegistration,
      },
      representatives: client.representatives.map((representative) => ({ ...representative })),
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

  const handleOpenContractWizard = () => {
    if (!client) {
      return;
    }

    navigate(`/subjects/${client.id}/contract-wizard`);
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
  const hasGeneralDirector = currentClient.representatives.some((item) => item.role === 'Генеральный директор');
  const availableRepresentativeRoles: ClientRepresentativeRole[] = isIndividualClient
    ? ['Представитель']
    : hasGeneralDirector
      ? ['Представитель']
      : ['Генеральный директор', 'Представитель'];
  const representativesWithSubjects = currentClient.representatives.map((item) => ({
    ...item,
    subject: getClientById(item.subjectId),
  }));
  const selectableSubjects = clients.filter((candidate) => candidate.id !== currentClient.id)
    .filter((candidate) => candidate.name.toLowerCase().includes(representativeQuery.toLowerCase()) || candidate.code.toLowerCase().includes(representativeQuery.toLowerCase()));

  const locationAddress = currentClient.addresses.locationMatchesRegistration ? currentClient.addresses.registration : currentClient.addresses.location;
  const mailingAddress = currentClient.addresses.mailingMatchesRegistration ? currentClient.addresses.registration : currentClient.addresses.mailing;

  const handleAddressSyncToggle = (key: 'locationMatchesRegistration' | 'mailingMatchesRegistration', checked: boolean) => {
    if (!isEditing) {
      return;
    }
    setDraftClient((prev) => {
      if (!prev) {
        return prev;
      }
      const nextAddresses = { ...prev.addresses, [key]: checked };
      if (checked) {
        if (key === 'locationMatchesRegistration') {
          nextAddresses.location = { ...prev.addresses.registration };
        } else {
          nextAddresses.mailing = { ...prev.addresses.registration };
        }
      }
      return { ...prev, addresses: nextAddresses };
    });
  };

  const handleAddRepresentative = () => {
    if (!newRepresentativeSubjectId || !newRepresentativeAuthorityBasis.trim()) {
      return;
    }
    if (!isIndividualClient && newRepresentativeRole === 'Генеральный директор' && hasGeneralDirector) {
      return;
    }
    const nextRepresentative = {
      id: `rep-${Date.now()}`,
      subjectId: newRepresentativeSubjectId,
      role: newRepresentativeRole,
      authorityBasis: newRepresentativeAuthorityBasis.trim(),
      authorityValidUntil: newRepresentativeWithoutExpiration ? null : newRepresentativeAuthorityValidUntil || null,
      authorityWithoutExpiration: newRepresentativeWithoutExpiration,
    } as const;

    if (isEditing) {
      setDraftClient((prev) => (prev ? { ...prev, representatives: [...prev.representatives, nextRepresentative] } : prev));
    } else {
      updateClient(currentClient.id, { representatives: [...currentClient.representatives, nextRepresentative] });
    }
    setIsRepresentativeModalOpen(false);
    setRepresentativeQuery('');
    setNewRepresentativeSubjectId('');
    setNewRepresentativeRole(isIndividualClient ? 'Представитель' : 'Генеральный директор');
    setNewRepresentativeAuthorityBasis('');
    setNewRepresentativeAuthorityValidUntil('');
    setNewRepresentativeWithoutExpiration(false);
  };

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
              <Button size="sm" onClick={handleOpenContractWizard}>
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

          <ProfileSection title="Адреса">
            <div className="space-y-5">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Адрес регистрации</p>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {isEditing ? (
                    <>
                      <FormField label="Страна" value={currentClient.addresses.registration.country} onChange={(event) => setDraftClient((prev) => prev ? ({ ...prev, addresses: { ...prev.addresses, registration: { ...prev.addresses.registration, country: event.target.value } } }) : prev)} />
                      <FormField label="Регион" value={currentClient.addresses.registration.region} onChange={(event) => setDraftClient((prev) => prev ? ({ ...prev, addresses: { ...prev.addresses, registration: { ...prev.addresses.registration, region: event.target.value } } }) : prev)} />
                      <FormField label="Город" value={currentClient.addresses.registration.city} onChange={(event) => setDraftClient((prev) => prev ? ({ ...prev, addresses: { ...prev.addresses, registration: { ...prev.addresses.registration, city: event.target.value } } }) : prev)} />
                      <FormField label="Улица" value={currentClient.addresses.registration.street} onChange={(event) => setDraftClient((prev) => prev ? ({ ...prev, addresses: { ...prev.addresses, registration: { ...prev.addresses.registration, street: event.target.value } } }) : prev)} />
                      <FormField label="Дом" value={currentClient.addresses.registration.house} onChange={(event) => setDraftClient((prev) => prev ? ({ ...prev, addresses: { ...prev.addresses, registration: { ...prev.addresses.registration, house: event.target.value } } }) : prev)} />
                      <FormField label="Индекс" value={currentClient.addresses.registration.postalCode} onChange={(event) => setDraftClient((prev) => prev ? ({ ...prev, addresses: { ...prev.addresses, registration: { ...prev.addresses.registration, postalCode: event.target.value } } }) : prev)} />
                    </>
                  ) : (
                    <>
                      <ProfileField label="Страна" value={currentClient.addresses.registration.country} />
                      <ProfileField label="Регион" value={currentClient.addresses.registration.region} />
                      <ProfileField label="Город" value={currentClient.addresses.registration.city} />
                      <ProfileField label="Улица" value={currentClient.addresses.registration.street} />
                      <ProfileField label="Дом" value={currentClient.addresses.registration.house} />
                      <ProfileField label="Индекс" value={currentClient.addresses.registration.postalCode} />
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Button variant="secondary" size="sm" onClick={() => setShowAdditionalAddresses((prev) => !prev)}>
                  {showAdditionalAddresses ? 'Скрыть остальные адреса' : 'Показать остальные адреса'}
                </Button>
              </div>

              {showAdditionalAddresses ? (['location', 'mailing'] as const).map((kind) => {
                const isLocation = kind === 'location';
                const synced = isLocation ? currentClient.addresses.locationMatchesRegistration : currentClient.addresses.mailingMatchesRegistration;
                const address = isLocation ? locationAddress : mailingAddress;
                return (
                  <div key={kind}>
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{isLocation ? 'Адрес местонахождения' : 'Почтовый адрес'}</p>
                      {isEditing ? (
                        <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                          <input type="checkbox" checked={synced} onChange={(event) => handleAddressSyncToggle(isLocation ? 'locationMatchesRegistration' : 'mailingMatchesRegistration', event.target.checked)} />
                          Совпадает с адресом регистрации
                        </label>
                      ) : null}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {isEditing ? (
                        <>
                          <FormField label="Страна" value={address.country} disabled={synced} onChange={(event) => setDraftClient((prev) => prev ? ({ ...prev, addresses: { ...prev.addresses, [kind]: { ...prev.addresses[kind], country: event.target.value } } }) : prev)} />
                          <FormField label="Регион" value={address.region} disabled={synced} onChange={(event) => setDraftClient((prev) => prev ? ({ ...prev, addresses: { ...prev.addresses, [kind]: { ...prev.addresses[kind], region: event.target.value } } }) : prev)} />
                          <FormField label="Город" value={address.city} disabled={synced} onChange={(event) => setDraftClient((prev) => prev ? ({ ...prev, addresses: { ...prev.addresses, [kind]: { ...prev.addresses[kind], city: event.target.value } } }) : prev)} />
                          <FormField label="Улица" value={address.street} disabled={synced} onChange={(event) => setDraftClient((prev) => prev ? ({ ...prev, addresses: { ...prev.addresses, [kind]: { ...prev.addresses[kind], street: event.target.value } } }) : prev)} />
                          <FormField label="Дом" value={address.house} disabled={synced} onChange={(event) => setDraftClient((prev) => prev ? ({ ...prev, addresses: { ...prev.addresses, [kind]: { ...prev.addresses[kind], house: event.target.value } } }) : prev)} />
                          <FormField label="Индекс" value={address.postalCode} disabled={synced} onChange={(event) => setDraftClient((prev) => prev ? ({ ...prev, addresses: { ...prev.addresses, [kind]: { ...prev.addresses[kind], postalCode: event.target.value } } }) : prev)} />
                        </>
                      ) : (
                        <>
                          <ProfileField label="Страна" value={address.country} />
                          <ProfileField label="Регион" value={address.region} />
                          <ProfileField label="Город" value={address.city} />
                          <ProfileField label="Улица" value={address.street} />
                          <ProfileField label="Дом" value={address.house} />
                          <ProfileField label="Индекс" value={address.postalCode} />
                        </>
                      )}
                    </div>
                  </div>
                );
              }) : null}
            </div>
          </ProfileSection>

          <ProfileSection title="Представители">
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setNewRepresentativeRole(isIndividualClient ? 'Представитель' : 'Генеральный директор');
                    setIsRepresentativeModalOpen(true);
                  }}
                >
                  + Добавить представителя
                </Button>
              </div>
              {representativesWithSubjects.length === 0 ? (
                <p className="text-sm text-slate-500">Представители не добавлены.</p>
              ) : (
                representativesWithSubjects.map((representative) => (
                  <div key={representative.id} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm md:grid-cols-4">
                    <p className="text-slate-500">{representative.role}</p>
                    <button type="button" className="text-left font-medium text-brand hover:underline" onClick={() => representative.subject && navigate(`/subjects/${representative.subject.id}`)}>
                      {representative.subject?.name ?? '—'}
                    </button>
                    <p>{representative.authorityBasis || '—'}</p>
                    <p>{representative.authorityWithoutExpiration ? 'Без срока действия' : representative.authorityValidUntil || '—'}</p>
                  </div>
                ))
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
                    </>
                  ) : (
                    <>
                      <ProfileField label="Дата регистрации" value={client.legalEntityDetails?.registrationDate ?? '—'} />
                      <ProfileField label="Регистрирующий орган" value={client.legalEntityDetails?.registrationAuthority ?? '—'} />
                      <ProfileField label="Уставный капитал" value={client.legalEntityDetails?.authorizedCapital ?? '—'} />
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
                      <ProfileField label="Выгодоприобретатель" value={client.legalEntityDetails?.beneficiary ?? '—'} />
                      <ProfileField label="Лица, действующие без доверенности" value={client.legalEntityDetails?.authorizedPersons ?? '—'} />
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
        <SubjectContractsTab clientId={client.id} />
      ) : activeTab === 'history' ? (
        <SubjectHistoryTab clientId={client.id} />
      ) : (
        <EmptyState title="Неизвестная вкладка" description="Выберите доступный раздел карточки клиента." />
      )}

      {isRepresentativeModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Добавить представителя</h3>
              <Button variant="secondary" size="sm" onClick={() => setIsRepresentativeModalOpen(false)}>
                Закрыть
              </Button>
            </div>
            <div className="space-y-4">
              <FormField label="Поиск субъекта" value={representativeQuery} onChange={(event) => setRepresentativeQuery(event.target.value)} placeholder="Введите ФИО или код" />
              <label className="space-y-1">
                <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Субъект</span>
                <select value={newRepresentativeSubjectId} onChange={(event) => setNewRepresentativeSubjectId(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
                  <option value="">Выберите субъекта</option>
                  {selectableSubjects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Роль</span>
                  <select value={newRepresentativeRole} onChange={(event) => setNewRepresentativeRole(event.target.value as ClientRepresentativeRole)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
                    {availableRepresentativeRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <FormField label="Основание полномочий" value={newRepresentativeAuthorityBasis} onChange={(event) => setNewRepresentativeAuthorityBasis(event.target.value)} />
                <FormField label="Срок действия полномочий" type="date" value={newRepresentativeAuthorityValidUntil} disabled={newRepresentativeWithoutExpiration} onChange={(event) => setNewRepresentativeAuthorityValidUntil(event.target.value)} />
                <label className="inline-flex items-center gap-2 pt-6 text-sm text-slate-700">
                  <input type="checkbox" checked={newRepresentativeWithoutExpiration} onChange={(event) => setNewRepresentativeWithoutExpiration(event.target.checked)} />
                  Без срока действия
                </label>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={handleAddRepresentative}>
                  Сохранить
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {toastMessage && (
        <div className="fixed right-6 bottom-6 z-50 rounded-md bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{toastMessage}</div>
      )}
    </div>
  );
};
