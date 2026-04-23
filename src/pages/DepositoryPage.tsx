import { ReportsPageTemplate } from '../components/crm/ReportsPageTemplate';

export const DepositoryPage = () => {
  return (
    <ReportsPageTemplate
      title="Отчёты депозитария"
      department="Депозитарий"
      separateSearchRow
      searchPlaceholder="Поиск по коду клиента, имени файла или отчёту"
    />
  );
};
