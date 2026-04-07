import React, { createContext, useContext, useState } from 'react';

const BudgetAlertContext = createContext({ alertCount: 0, setAlertCount: () => {} });

export function BudgetAlertProvider({ children }) {
  const [alertCount, setAlertCount] = useState(0);
  return (
    <BudgetAlertContext.Provider value={{ alertCount, setAlertCount }}>
      {children}
    </BudgetAlertContext.Provider>
  );
}

export function useBudgetAlert() {
  return useContext(BudgetAlertContext);
}
