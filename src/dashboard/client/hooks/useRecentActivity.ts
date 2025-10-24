import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export function useRecentActivity(limit?: number) {
  return useQuery({
    queryKey: ['recent-activity', limit],
    queryFn: () => api.getRecentActivity(limit),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
