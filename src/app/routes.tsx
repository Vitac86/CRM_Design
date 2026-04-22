import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { DashboardPage } from '../pages/DashboardPage';
import { SubjectsPage } from '../pages/SubjectsPage';
import { DocumentsPage } from '../pages/DocumentsPage';
import { TradingPage } from '../pages/TradingPage';
import { TradingCardPage } from '../pages/TradingCardPage';
import { SubjectProfilePage } from '../pages/SubjectProfilePage';
import { ClientRegistrationWizardPage } from '../pages/ClientRegistrationWizardPage';
import { RequestsPage } from '../pages/RequestsPage';
import { CompliancePage } from '../pages/CompliancePage';
import { ComplianceCardPage } from '../pages/ComplianceCardPage';
import { MiddleOfficePage } from '../pages/MiddleOfficePage';
import { BackOfficePage } from '../pages/BackOfficePage';
import { DepositoryPage } from '../pages/DepositoryPage';
import { BrokeragePage } from '../pages/BrokeragePage';
import { TrustManagementPage } from '../pages/TrustManagementPage';
import { AgentsPage } from '../pages/AgentsPage';
import { ArchivesPage } from '../pages/ArchivesPage';
import { AdministrationPage } from '../pages/AdministrationPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'subjects', element: <SubjectsPage /> },
      { path: 'subjects/register', element: <ClientRegistrationWizardPage /> },
      { path: 'subjects/:id', element: <SubjectProfilePage /> },
      { path: 'brokerage', element: <BrokeragePage /> },
      { path: 'trust-management', element: <TrustManagementPage /> },
      { path: 'agents', element: <AgentsPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'archives', element: <ArchivesPage /> },
      { path: 'requests', element: <RequestsPage /> },
      { path: 'compliance', element: <CompliancePage /> },
      { path: 'compliance/:id', element: <ComplianceCardPage /> },
      { path: 'middle-office', element: <MiddleOfficePage /> },
      { path: 'back-office', element: <BackOfficePage /> },
      { path: 'trading', element: <TradingPage /> },
      { path: 'trading/:id', element: <TradingCardPage /> },
      { path: 'depository', element: <DepositoryPage /> },
      { path: 'administration', element: <AdministrationPage /> },
    ],
  },
]);
