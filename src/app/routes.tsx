import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { RoutePlaceholderPage } from '../pages/RoutePlaceholderPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <RoutePlaceholderPage /> },
      { path: 'subjects', element: <RoutePlaceholderPage /> },
      { path: 'subjects/:id', element: <RoutePlaceholderPage /> },
      { path: 'brokerage', element: <RoutePlaceholderPage /> },
      { path: 'trust-management', element: <RoutePlaceholderPage /> },
      { path: 'agents', element: <RoutePlaceholderPage /> },
      { path: 'documents', element: <RoutePlaceholderPage /> },
      { path: 'archives', element: <RoutePlaceholderPage /> },
      { path: 'requests', element: <RoutePlaceholderPage /> },
      { path: 'compliance', element: <RoutePlaceholderPage /> },
      { path: 'compliance/:id', element: <RoutePlaceholderPage /> },
      { path: 'middle-office', element: <RoutePlaceholderPage /> },
      { path: 'back-office', element: <RoutePlaceholderPage /> },
      { path: 'trading', element: <RoutePlaceholderPage /> },
      { path: 'trading/:id', element: <RoutePlaceholderPage /> },
      { path: 'depository', element: <RoutePlaceholderPage /> },
      { path: 'administration', element: <RoutePlaceholderPage /> },
    ],
  },
]);
