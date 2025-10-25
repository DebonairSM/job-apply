import React, { createContext, useContext, useState, ReactNode } from 'react';

interface JobNavigationContextType {
  navigateToJob: (jobId: string) => void;
  clearNavigation: () => void;
  targetJobId: string | null;
}

const JobNavigationContext = createContext<JobNavigationContextType | undefined>(undefined);

export function JobNavigationProvider({ children }: { children: ReactNode }) {
  const [targetJobId, setTargetJobId] = useState<string | null>(null);

  const navigateToJob = (jobId: string) => {
    setTargetJobId(jobId);
  };

  const clearNavigation = () => {
    setTargetJobId(null);
  };

  return (
    <JobNavigationContext.Provider value={{
      navigateToJob,
      clearNavigation,
      targetJobId
    }}>
      {children}
    </JobNavigationContext.Provider>
  );
}

export function useJobNavigation() {
  const context = useContext(JobNavigationContext);
  if (context === undefined) {
    throw new Error('useJobNavigation must be used within a JobNavigationProvider');
  }
  return context;
}
