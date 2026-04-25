import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { DataAccessProvider } from './app/dataAccess/DataAccessProvider';
import './styles/globals.css';
import { ThemeProvider } from './theme/ThemeProvider';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <DataAccessProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </DataAccessProvider>
  </React.StrictMode>,
);
