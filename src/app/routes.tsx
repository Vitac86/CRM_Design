import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AppShell } from '../components/layout/AppShell';
import { AgentsPage } from '../pages/AgentsPage';
import { AppErrorPage } from '../pages/AppErrorPage';
import { ArchivesPage } from '../pages/ArchivesPage';
import { AuthEntryPage } from '../pages/auth/AuthEntryPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { BackOfficePage } from '../pages/BackOfficePage';
import { BrokeragePage } from '../pages/BrokeragePage';
import { ClientRegistrationWizardPage } from '../pages/ClientRegistrationWizardPage';
import { ComplianceCardPage } from '../pages/ComplianceCardPage';
import { CompliancePage } from '../pages/CompliancePage';
import { ContractWizardPage } from '../pages/ContractWizardPage';
import { DashboardPage } from '../pages/DashboardPage';
import { DepositoryPage } from '../pages/DepositoryPage';
import { DocumentWizardPage } from '../pages/DocumentWizardPage';
import { MiddleOfficeClientsPage } from '../pages/MiddleOfficeClientsPage';
import { MiddleOfficeReportsPage } from '../pages/MiddleOfficeReportsPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RequestsPage } from '../pages/RequestsPage';
import { SubjectProfilePage } from '../pages/SubjectProfilePage';
import { SubjectsPage } from '../pages/SubjectsPage';
import { TradingCardPage } from '../pages/TradingCardPage';
import { TradingPage } from '../pages/TradingPage';
import { TrustManagementPage } from '../pages/TrustManagementPage';
import { AdministrationPage } from '../pages/AdministrationPage';
import { routeParams, routes } from '../routes/paths';

export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <AppErrorPage />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: routes.auth.slice(1), element: <AuthEntryPage /> },
          { path: routes.login.slice(1), element: <LoginPage /> },
          { path: routes.register.slice(1), element: <RegisterPage /> },
          { path: routes.forgotPassword.slice(1), element: <ForgotPasswordPage /> },
          { path: routes.resetPassword.slice(1), element: <ResetPasswordPage /> },
        ],
      },
      {
        element: <AppShell />,
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
    ],
  },
]);
