import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { DashboardPage } from '../pages/DashboardPage';
import { SubjectsPage } from '../pages/SubjectsPage';
import { TradingPage } from '../pages/TradingPage';
import { TradingCardPage } from '../pages/TradingCardPage';
import { SubjectProfilePage } from '../pages/SubjectProfilePage';
import { ClientRegistrationWizardPage } from '../pages/ClientRegistrationWizardPage';
import { RequestsPage } from '../pages/RequestsPage';
import { CompliancePage } from '../pages/CompliancePage';
import { ComplianceCardPage } from '../pages/ComplianceCardPage';
import { BackOfficePage } from '../pages/BackOfficePage';
import { DepositoryPage } from '../pages/DepositoryPage';
import { BrokeragePage } from '../pages/BrokeragePage';
import { TrustManagementPage } from '../pages/TrustManagementPage';
import { AgentsPage } from '../pages/AgentsPage';
import { ArchivesPage } from '../pages/ArchivesPage';
import { AdministrationPage } from '../pages/AdministrationPage';
import { ContractWizardPage } from '../pages/ContractWizardPage';
import { DocumentWizardPage } from '../pages/DocumentWizardPage';
import { MiddleOfficeClientsPage } from '../pages/MiddleOfficeClientsPage';
import { MiddleOfficeReportsPage } from '../pages/MiddleOfficeReportsPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { AppErrorPage } from '../pages/AppErrorPage';
import { routeParams, routes } from '../routes/paths';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <AppErrorPage />,
    children: [
      { index: true, element: <Navigate to={routes.dashboard} replace /> },
      { path: routes.dashboard.slice(1), element: <DashboardPage /> },
      { path: routes.subjects.slice(1), element: <SubjectsPage /> },
      { path: routes.subjectRegister.slice(1), element: <ClientRegistrationWizardPage /> },
      { path: `subjects/${routeParams.subjectId}`, element: <SubjectProfilePage /> },
      { path: `subjects/${routeParams.subjectId}/contract-wizard`, element: <ContractWizardPage /> },
      { path: `subjects/${routeParams.subjectId}/document-wizard`, element: <DocumentWizardPage /> },
      { path: routes.brokerage.slice(1), element: <BrokeragePage /> },
      { path: routes.trustManagement.slice(1), element: <TrustManagementPage /> },
      { path: routes.agents.slice(1), element: <AgentsPage /> },
      { path: routes.archives.slice(1), element: <ArchivesPage /> },
      { path: routes.requests.slice(1), element: <RequestsPage /> },
      { path: routes.compliance.slice(1), element: <CompliancePage /> },
      { path: `compliance/${routeParams.complianceId}`, element: <ComplianceCardPage /> },
      { path: routes.middleOffice.slice(1), element: <Navigate to={routes.middleOfficeClients} replace /> },
      { path: routes.middleOfficeClients.slice(1), element: <MiddleOfficeClientsPage /> },
      { path: routes.middleOfficeReports.slice(1), element: <MiddleOfficeReportsPage /> },
      { path: routes.backOffice.slice(1), element: <BackOfficePage /> },
      { path: routes.trading.slice(1), element: <TradingPage /> },
      { path: `trading/${routeParams.tradingId}`, element: <TradingCardPage /> },
      { path: routes.depository.slice(1), element: <DepositoryPage /> },
      { path: routes.administration.slice(1), element: <AdministrationPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
