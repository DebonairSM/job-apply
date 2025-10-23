import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useRuns(params?: {
  jobId?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['runs', params],
    queryFn: () => api.getRuns(params),
    refetchInterval: 5000
  });
}

