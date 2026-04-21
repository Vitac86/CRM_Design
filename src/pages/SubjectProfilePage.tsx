import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ClientProfileHeader } from '../components/crm/ClientProfileHeader';
import { PermissionCard } from '../components/crm/PermissionCard';
import { PersonCard } from '../components/crm/PersonCard';
import { ProfileField } from '../components/crm/ProfileField';
import { ProfileSection } from '../components/crm/ProfileSection';
import { ReportMethodCard } from '../components/crm/ReportMethodCard';
import { getClientById } from '../data/clients';
import { EmptyState, Tabs } from '../components/ui';

type SubjectTab = 'profile' | 'documents' | 'contracts' | 'history';

const tabs = [
  { value: 'profile', label: 'Профиль' },
  { value: 'documents', label: 'Документы' },
  { value: 'contracts', label: 'Договоры и счета' },
  { value: 'history', label: 'История' },
];

const renderPlaceholder = (tab: SubjectTab) => {
  const titleByTab: Record<Exclude<SubjectTab, 'profile'>, string> = {
    documents: 'Документы',
    contracts: 'Договоры и счета',
    history: 'История',
  };

  return (
    <EmptyState
      title="Раздел будет реализован позже"
      description={`Вкладка «${titleByTab[tab as Exclude<SubjectTab, 'profile'>]}» пока недоступна.`}
    />
  );
};

export const SubjectProfilePage = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<SubjectTab>('profile');

  const client = useMemo(() => {
    if (!id) {
      return undefined;
    }

    return getClientById(id);
  }, [id]);

  if (!client) {
    return (
      <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
        <EmptyState title="Клиент не найден" description="Проверьте ссылку или вернитесь к списку субъектов." />
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <ClientProfileHeader client={client} />

      <Tabs items={tabs} value={activeTab} onChange={(tab) => setActiveTab(tab as SubjectTab)} />

      {activeTab === 'profile' ? (
        <div className="space-y-4">
          <ProfileSection title="Основные данные">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ProfileField label="Фамилия" value={client.lastName} />
              <ProfileField label="Имя" value={client.firstName} />
              <ProfileField label="Отчество" value={client.middleName} />
              <ProfileField label="Тип клиента" value={client.type} />
              <ProfileField label="Признак резидентства" value={client.residency} />
              <ProfileField label="Дата рождения" value={client.birthDate} />
              <ProfileField label="ИНН" value={client.inn} mono />
              <ProfileField label="ОГРНИП" value={client.ogrnip} mono />
              <ProfileField label="Признак инвестора" value={client.qualification ? 'Квалифицированный' : 'Неквалифицированный'} />
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

          <ProfileSection title="Контактные данные">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ProfileField label="Телефон" value={client.phone} mono />
              <ProfileField label="Дополнительный телефон" value={client.secondaryPhone} mono />
              <ProfileField label="Email" value={client.email} />
            </div>
          </ProfileSection>

          <ProfileSection title="Адрес регистрации">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ProfileField label="Страна" value={client.registrationAddress.country} />
              <ProfileField label="Регион" value={client.registrationAddress.region} />
              <ProfileField label="Район" value={client.registrationAddress.district} />
              <ProfileField label="Город" value={client.registrationAddress.city} />
              <ProfileField label="Индекс" value={client.registrationAddress.postalCode} mono />
              <ProfileField label="Улица" value={client.registrationAddress.street} />
              <ProfileField label="Дом" value={client.registrationAddress.house} />
              <ProfileField label="Корпус" value={client.registrationAddress.building} />
              <ProfileField label="Квартира" value={client.registrationAddress.apartment} />
            </div>
          </ProfileSection>

          <ProfileSection title="Банковские реквизиты">
            <div className="grid gap-4 md:grid-cols-2">
              <ProfileField label="Наименование банка" value={client.bankDetails.bankName} />
              <ProfileField label="БИК" value={client.bankDetails.bik} mono />
              <ProfileField label="Расчётный счёт" value={client.bankDetails.checkingAccount} mono />
              <ProfileField label="Корреспондентский счёт" value={client.bankDetails.correspondentAccount} mono />
            </div>
          </ProfileSection>
        </div>
      ) : (
        renderPlaceholder(activeTab)
      )}
    </div>
  );
};
