import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export function useActivity(limit?: number) {
  return useQuery({
    queryKey: ['activity', limit],
    queryFn: () => api.getActivity(limit),
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });
}
