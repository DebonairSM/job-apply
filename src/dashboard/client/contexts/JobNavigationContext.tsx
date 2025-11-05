import React, { createContext, useContext, ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface JobNavigationContextType {
  navigateToJob: (jobId: string) => void;
}

const JobNavigationContext = createContext<JobNavigationContextType | undefined>(undefined);

export function JobNavigationProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const navigateToJob = (jobId: string) => {
    navigate(`/jobs?jobId=${jobId}`);
  };

  return (
    <JobNavigationContext.Provider value={{ navigateToJob }}>
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
