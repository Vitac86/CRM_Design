import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { RoutePlaceholderPage } from '../pages/RoutePlaceholderPage';
import { DashboardPage } from '../pages/DashboardPage';
import { SubjectsPage } from '../pages/SubjectsPage';
import { DocumentsPage } from '../pages/DocumentsPage';
import { TradingPage } from '../pages/TradingPage';
import { TradingCardPage } from '../pages/TradingCardPage';
import { SubjectProfilePage } from '../pages/SubjectProfilePage';
import { RequestsPage } from '../pages/RequestsPage';
import { CompliancePage } from '../pages/CompliancePage';
import { ComplianceCardPage } from '../pages/ComplianceCardPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'subjects', element: <SubjectsPage /> },
      { path: 'subjects/:id', element: <SubjectProfilePage /> },
      { path: 'brokerage', element: <RoutePlaceholderPage /> },
      { path: 'trust-management', element: <RoutePlaceholderPage /> },
      { path: 'agents', element: <RoutePlaceholderPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'archives', element: <RoutePlaceholderPage /> },
      { path: 'requests', element: <RequestsPage /> },
      { path: 'compliance', element: <CompliancePage /> },
      { path: 'compliance/:id', element: <ComplianceCardPage /> },
      { path: 'middle-office', element: <RoutePlaceholderPage /> },
      { path: 'back-office', element: <RoutePlaceholderPage /> },
      { path: 'trading', element: <TradingPage /> },
      { path: 'trading/:id', element: <TradingCardPage /> },
      { path: 'depository', element: <RoutePlaceholderPage /> },
      { path: 'administration', element: <RoutePlaceholderPage /> },
    ],
  },
]);
