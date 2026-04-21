import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SubjectContractsTab } from '../components/crm/SubjectContractsTab';
import { SubjectDocumentsTab } from '../components/crm/SubjectDocumentsTab';
import { SubjectHeader } from '../components/crm/SubjectHeader';
import { SubjectHistoryTab } from '../components/crm/SubjectHistoryTab';
import { SubjectProfileTabs, type SubjectProfileTab } from '../components/crm/SubjectProfileTabs';
import { SubjectRelationsTab } from '../components/crm/SubjectRelationsTab';
import { getClientById } from '../data/clients';
import { Card, EmptyState } from '../components/ui';

const SubjectProfileTabContent = ({ clientId, activeTab }: { clientId: string; activeTab: SubjectProfileTab }) => {
  if (activeTab === 'documents') {
    return <SubjectDocumentsTab clientId={clientId} />;
  }

  if (activeTab === 'relations') {
    return <SubjectRelationsTab clientId={clientId} />;
  }

  if (activeTab === 'contracts') {
    return <SubjectContractsTab clientId={clientId} />;
  }

  if (activeTab === 'history') {
    return <SubjectHistoryTab clientId={clientId} />;
  }

  return null;
};

export const SubjectProfilePage = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<SubjectProfileTab>('profile');

  const client = useMemo(() => {
    if (!id) {
      return undefined;
    }

    return getClientById(id);
  }, [id]);

  if (!client) {
    return <EmptyState title="Клиент не найден" description="Проверьте корректность ссылки или вернитесь к списку субъектов." />;
  }

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <SubjectHeader client={client} />

      <Card className="overflow-hidden">
        <SubjectProfileTabs activeTab={activeTab} onChange={setActiveTab} />

        <div className="p-4 sm:p-5">
          {activeTab === 'profile' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="space-y-3 p-4">
                <h3 className="text-base font-semibold text-slate-900">Основные данные</h3>
                <div className="space-y-2 text-sm text-slate-700">
                  <p><span className="text-slate-500">Тип клиента:</span> {client.type}</p>
                  <p><span className="text-slate-500">ИНН:</span> {client.inn}</p>
                  <p><span className="text-slate-500">Резидентство:</span> {client.residency}</p>
                  <p><span className="text-slate-500">Статус комплаенса:</span> {client.complianceStatus}</p>
                  <p><span className="text-slate-500">Риск-категория:</span> {client.riskCategory}</p>
                </div>
              </Card>

              <Card className="space-y-3 p-4">
                <h3 className="text-base font-semibold text-slate-900">Контактные данные</h3>
                <div className="space-y-2 text-sm text-slate-700">
                  <p><span className="text-slate-500">Телефон:</span> {client.phone}</p>
                  <p><span className="text-slate-500">Email:</span> {client.email}</p>
                  <p><span className="text-slate-500">Адрес:</span> {client.address}</p>
                  <p><span className="text-slate-500">Представитель:</span> {client.representative}</p>
                  <p><span className="text-slate-500">Обновлено:</span> {client.updatedAt}</p>
                </div>
              </Card>

              <Card className="space-y-3 p-4">
                <h3 className="text-base font-semibold text-slate-900">Адрес регистрации</h3>
                <p className="text-sm text-slate-700">{client.address}</p>
              </Card>

              <Card className="space-y-3 p-4">
                <h3 className="text-base font-semibold text-slate-900">Банковские реквизиты</h3>
                <div className="space-y-2 text-sm text-slate-700">
                  <p><span className="text-slate-500">Банк:</span> АО «ИнвестБанк»</p>
                  <p><span className="text-slate-500">БИК:</span> 044525000</p>
                  <p><span className="text-slate-500">Расчётный счёт:</span> 40702810900000000001</p>
                  <p><span className="text-slate-500">Корр. счёт:</span> 30101810400000000000</p>
                </div>
              </Card>
            </div>
          ) : (
            <SubjectProfileTabContent clientId={client.id} activeTab={activeTab} />
          )}
        </div>
      </Card>
    </div>
  );
};
