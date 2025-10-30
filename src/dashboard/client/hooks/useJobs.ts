import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useJobs(params?: {
  status?: string;
  easyApply?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: () => api.getJobs(params),
    refetchInterval: 5000
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => api.getJob(id),
    enabled: !!id
  });
}

