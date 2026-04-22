import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clients } from '../data/clients';
import type { Client, ClientRole, ClientType, ComplianceStatus, ResidencyStatus } from '../data/types';
import { Badge, Button, DataTable, FilterBar, Pagination, SelectFilter } from '../components/ui';
import {
  formatClientType,
  formatComplianceStatus,
  formatResidency,
  getClientTypeBadgeVariant,
  getComplianceBadgeVariant,
  getResidencyBadgeVariant,
} from '../utils/labels';

const allRoles: ClientRole[] = ['Клиент', 'Бенефициар', 'Представитель'];
const pageSize = 10;

export const SubjectsPage = () => {
  const navigate = useNavigate();

  const [typeFilter, setTypeFilter] = useState<ClientType | 'all'>('all');
  const [residencyFilter, setResidencyFilter] = useState<ResidencyStatus | 'all'>('all');
  const [complianceFilter, setComplianceFilter] = useState<ComplianceStatus | 'all'>('all');
  const [qualificationFilter, setQualificationFilter] = useState<'all' | 'qualified' | 'not-qualified'>('all');
  const [roleFilter, setRoleFilter] = useState<ClientRole | 'all'>('all');
  const [page, setPage] = useState(1);

  const typeOptions = useMemo(() => [...new Set(clients.map((client) => client.type))], []);
  const residencyOptions = useMemo(() => [...new Set(clients.map((client) => client.residency))], []);
  const complianceOptions = useMemo(() => [...new Set(clients.map((client) => client.complianceStatus))], []);

  const filteredClients = useMemo(
    () =>
      clients.filter((client) => {
        if (typeFilter !== 'all' && client.type !== typeFilter) {
          return false;
        }

        if (residencyFilter !== 'all' && client.residency !== residencyFilter) {
          return false;
        }

        if (complianceFilter !== 'all' && client.complianceStatus !== complianceFilter) {
          return false;
        }

        if (qualificationFilter === 'qualified' && !client.qualification) {
          return false;
        }

        if (qualificationFilter === 'not-qualified' && client.qualification) {
          return false;
        }

        if (roleFilter !== 'all' && !client.roles.includes(roleFilter)) {
          return false;
        }

        return true;
      }),
    [typeFilter, residencyFilter, complianceFilter, qualificationFilter, roleFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const paginatedClients = useMemo(
    () => filteredClients.slice((page - 1) * pageSize, page * pageSize),
    [filteredClients, page],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

  const resetFilters = () => {
    setTypeFilter('all');
    setResidencyFilter('all');
    setComplianceFilter('all');
    setQualificationFilter('all');
    setRoleFilter('all');
    setPage(1);
  };

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Субъекты</h1>
        <Button className="w-full sm:w-auto" onClick={() => navigate('/subjects/register')}>
          + Добавить
        </Button>
      </header>

      <FilterBar>
        <SelectFilter value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as ClientType | 'all')}>
          <option value="all">Типы</option>
          {typeOptions.map((type) => (
            <option key={type} value={type}>
              {formatClientType(type)}
            </option>
          ))}
        </SelectFilter>

        <SelectFilter
          value={residencyFilter}
          onChange={(event) => setResidencyFilter(event.target.value as ResidencyStatus | 'all')}
        >
          <option value="all">Признак резидентства</option>
          {residencyOptions.map((residency) => (
            <option key={residency} value={residency}>
              {formatResidency(residency)}
            </option>
          ))}
        </SelectFilter>

        <SelectFilter
          value={complianceFilter}
          onChange={(event) => setComplianceFilter(event.target.value as ComplianceStatus | 'all')}
        >
          <option value="all">Статус комплаенса</option>
          {complianceOptions.map((status) => (
            <option key={status} value={status}>
              {formatComplianceStatus(status)}
            </option>
          ))}
        </SelectFilter>

        <SelectFilter value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as ClientRole | 'all')}>
          <option value="all">Роли</option>
          {allRoles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </SelectFilter>

        <SelectFilter
          value={qualificationFilter}
          onChange={(event) =>
            setQualificationFilter(event.target.value as 'all' | 'qualified' | 'not-qualified')
          }
        >
          <option value="all">Квалификация</option>
          <option value="qualified">Квалифицированный</option>
          <option value="not-qualified">Неквалифицированный</option>
        </SelectFilter>

        <Button variant="secondary" className="ml-auto" onClick={resetFilters}>
          Очистить фильтры
        </Button>
      </FilterBar>

      <DataTable<Client>
        columns={[
          { key: 'code', header: 'Код клиента', className: 'font-medium text-slate-800' },
          { key: 'name', header: 'Наименование клиента', className: 'min-w-[260px]' },
          { key: 'inn', header: 'ИНН' },
          {
            key: 'type',
            header: 'Тип',
            render: (client) => <Badge variant={getClientTypeBadgeVariant(client.type)}>{formatClientType(client.type)}</Badge>,
          },
          {
            key: 'residency',
            header: 'Резидент',
            render: (client) => (
              <Badge variant={getResidencyBadgeVariant(client.residency)}>{formatResidency(client.residency)}</Badge>
            ),
          },
          {
            key: 'complianceStatus',
            header: 'Статус комплаенса',
            render: (client) => (
              <Badge variant={getComplianceBadgeVariant(client.complianceStatus)}>
                {formatComplianceStatus(client.complianceStatus)}
              </Badge>
            ),
          },
          {
            key: 'fullDocumentSet',
            header: 'Полный комплект',
            render: (client) => (
              <Badge variant={client.fullDocumentSet ? 'success' : 'warning'}>
                {client.fullDocumentSet ? 'Да' : 'Нет'}
              </Badge>
            ),
          },
        ]}
        rows={paginatedClients}
        emptyMessage="По выбранным фильтрам данных нет"
        rowClassName={() => 'cursor-pointer'}
        onRowClick={(client) => navigate(`/subjects/${client.id}`)}
      />

      <div className="flex justify-end">
        <Pagination
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
          onNext={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
        />
      </div>
    </div>
  );
};
