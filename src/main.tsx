import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { ClientsProvider } from './app/ClientsStore';
import { DataAccessProvider } from './app/dataAccess/DataAccessProvider';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <DataAccessProvider>
      <ClientsProvider>
        <App />
      </ClientsProvider>
    </DataAccessProvider>
  </React.StrictMode>,
);
