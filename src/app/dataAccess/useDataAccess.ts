import { useContext } from 'react';
import { DataAccessContext } from './DataAccessProvider';

export const useDataAccess = () => {
  const context = useContext(DataAccessContext);

  if (!context) {
    throw new Error('useDataAccess must be used within DataAccessProvider');
  }

  return context;
};
