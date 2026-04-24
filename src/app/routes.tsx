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
import { MiddleOfficeClientsPage } from '../pages/MiddleOfficeClientsPage';
import { MiddleOfficeReportsPage } from '../pages/MiddleOfficeReportsPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { AppErrorPage } from '../pages/AppErrorPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <AppErrorPage />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'subjects', element: <SubjectsPage /> },
      { path: 'subjects/register', element: <ClientRegistrationWizardPage /> },
      { path: 'subjects/:id', element: <SubjectProfilePage /> },
      { path: 'subjects/:subjectId/contract-wizard', element: <ContractWizardPage /> },
      { path: 'brokerage', element: <BrokeragePage /> },
      { path: 'trust-management', element: <TrustManagementPage /> },
      { path: 'agents', element: <AgentsPage /> },
      { path: 'archives', element: <ArchivesPage /> },
      { path: 'requests', element: <RequestsPage /> },
      { path: 'compliance', element: <CompliancePage /> },
      { path: 'compliance/:id', element: <ComplianceCardPage /> },
      { path: 'middle-office', element: <Navigate to="/middle-office/clients" replace /> },
      { path: 'middle-office/clients', element: <MiddleOfficeClientsPage /> },
      { path: 'middle-office/reports', element: <MiddleOfficeReportsPage /> },
      { path: 'back-office', element: <BackOfficePage /> },
      { path: 'trading', element: <TradingPage /> },
      { path: 'trading/:id', element: <TradingCardPage /> },
      { path: 'depository', element: <DepositoryPage /> },
      { path: 'administration', element: <AdministrationPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
