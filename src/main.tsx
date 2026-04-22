import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { ClientsProvider } from './app/ClientsStore';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ClientsProvider>
      <App />
    </ClientsProvider>
  </React.StrictMode>,
);
