import { Navigate, createBrowserRouter } from 'react-router-dom';
import { RoutePlaceholderPage } from '../pages/RoutePlaceholderPage';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/dashboard', element: <RoutePlaceholderPage /> },
  { path: '/subjects', element: <RoutePlaceholderPage /> },
  { path: '/subjects/:id', element: <RoutePlaceholderPage /> },
  { path: '/documents', element: <RoutePlaceholderPage /> },
  { path: '/requests', element: <RoutePlaceholderPage /> },
  { path: '/compliance', element: <RoutePlaceholderPage /> },
  { path: '/compliance/:id', element: <RoutePlaceholderPage /> },
  { path: '/middle-office', element: <RoutePlaceholderPage /> },
  { path: '/back-office', element: <RoutePlaceholderPage /> },
  { path: '/trading', element: <RoutePlaceholderPage /> },
  { path: '/trading/:id', element: <RoutePlaceholderPage /> },
  { path: '/depository', element: <RoutePlaceholderPage /> },
]);
